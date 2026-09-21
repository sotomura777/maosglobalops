import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { scheduleOf, overlaps } from "./schedule.js";
const fail = (message, code = "failed-precondition") => {
  throw new HttpsError(code, message);
};
const text = (value, max, required = false) => {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    fail("Verifica os campos preenchidos.", "invalid-argument");
  return value.trim();
};
const id = (value) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(value))
    fail("Identificador inválido.", "invalid-argument");
  return value;
};
const occupied = new Set(["confirmed", "completion_requested", "completed"]);
const actions = {
  company: {
    pending: ["accepted", "rejected"],
    accepted: ["cancelled"],
    confirmed: ["cancelled", "completion_requested", "no_show"],
  },
  worker: {
    pending: ["cancelled"],
    accepted: ["confirmed", "cancelled"],
    confirmed: ["cancelled"],
    completion_requested: ["completed", "confirmed"],
  },
};
function schedule(job) {
  try {
    return scheduleOf(job);
  } catch (e) {
    fail(e.message);
  }
}
function validatedJob(input, now) {
  if (!input || typeof input !== "object")
    fail("Oferta inválida.", "invalid-argument");
  const j = {};
  for (const [key, max, required] of [
    ["title", 120, true],
    ["category", 100, true],
    ["district", 100, true],
    ["location", 250, true],
    ["date", 10, true],
    ["startTime", 5, true],
    ["endTime", 5, true],
    ["paymentTerms", 300, true],
    ["description", 5000, true],
    ["transport", 300, false],
    ["meal", 300, false],
    ["equipment", 500, false],
  ])
    j[key] = text(input[key] ?? "", max, required);
  j.rate = Number(input.rate);
  j.vacancies = Number(input.vacancies);
  j.payType = input.payType;
  if (
    !Number.isFinite(j.rate) ||
    j.rate <= 0 ||
    j.rate > 100000 ||
    !Number.isInteger(j.vacancies) ||
    j.vacancies < 1 ||
    j.vacancies > 1000 ||
    !["hour", "service"].includes(j.payType)
  )
    fail("Verifica o pagamento e o número de vagas.", "invalid-argument");
  const s = schedule(j);
  if (s.startMs <= now) fail("O trabalho tem de começar no futuro.");
  return {
    ...j,
    startAt: Timestamp.fromMillis(s.startMs),
    endAt: Timestamp.fromMillis(s.endMs),
    timeZone: s.timeZone,
  };
}
// Dependency injection is only for tests; the deployed entry always uses server time.
export function createMarketplace(db, clock = Date.now) {
  return async ({ auth, data }) => {
    if (!auth?.uid) fail("Entra na tua conta.", "unauthenticated");
    const uid = auth.uid;
    const operation = data?.operation;
    const verified = auth.token?.email_verified === true;
    if (["publish", "apply"].includes(operation) && !verified)
      fail("Confirma o email em Segurança da conta.", "permission-denied");
    if (operation === "publish") {
      const jobId = id(data.id); // Stable request ID makes a retry safe after a lost response.
      const ref = db.collection("jobs").doc(jobId);
      const draftRef = data.draftId
        ? db.doc(`profiles/${uid}/jobDrafts/${id(data.draftId)}`)
        : null;
      await db.runTransaction(async (tx) => {
        const [p, existing] = await Promise.all([
          tx.get(db.doc(`profiles/${uid}`)),
          tx.get(ref),
        ]);
        if (p.data()?.kind !== "company")
          fail("Só as empresas podem publicar.", "permission-denied");
        if (existing.exists) {
          if (existing.data().companyId !== uid)
            fail("Oferta indisponível.", "permission-denied");
          return;
        }
        const job = validatedJob(data.job, clock());
        tx.create(ref, {
          ...job,
          companyId: uid,
          companyName: p.data().name,
          status: "open",
          featured: false,
          filled: 0,
          schemaVersion: 2,
          createdAt: new Date(clock()).toISOString(),
        });
        if (draftRef) tx.delete(draftRef);
      });
      return { id: jobId };
    }
    if (operation === "apply") {
      const jobId = id(data.jobId),
        ref = db.collection("engagements").doc(`${jobId}_${uid}`);
      const message = text(data.message ?? "", 2000);
      await db.runTransaction(async (tx) => {
        const [p, j, existing] = await Promise.all([
          tx.get(db.doc(`profiles/${uid}`)),
          tx.get(db.doc(`jobs/${jobId}`)),
          tx.get(ref),
        ]);
        if (p.data()?.kind !== "worker")
          fail("Só profissionais podem candidatar-se.", "permission-denied");
        if (existing.exists) return;
        const job = j.data();
        if (!job || job.status !== "open" || schedule(job).startMs <= clock())
          fail("Esta oferta já terminou ou foi encerrada.");
        if ((job.filled || 0) >= job.vacancies)
          fail("As vagas desta oferta já foram preenchidas.");
        tx.create(ref, {
          jobId,
          companyId: job.companyId,
          workerId: uid,
          workerName: p.data().name,
          companyName: job.companyName,
          title: job.title,
          message,
          status: "pending",
          actorId: uid,
          note: "",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      return { id: ref.id };
    }
    if (operation !== "transition")
      fail("Operação inválida.", "invalid-argument");
    const ref = db.doc(`engagements/${id(data.id)}`);
    const next = text(data.next, 30, true),
      expected = text(data.expected, 30, true),
      note = text(data.note ?? "", 1000);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref),
        a = snap.data();
      if (!a || ![a.workerId, a.companyId].includes(uid))
        fail("Contratação indisponível.", "permission-denied");
      // Only retry the same intent. A stale screen cannot overwrite another actor's change.
      if (
        a.status === next &&
        a.actorId === uid &&
        a.previousStatus === expected
      )
        return;
      if (a.status !== expected) fail("O estado mudou. Atualiza a página.");
      const role = uid === a.companyId ? "company" : "worker";
      if (!actions[role][a.status]?.includes(next))
        fail("Esta alteração não é permitida.", "permission-denied");
      if (
        (["cancelled", "rejected", "no_show"].includes(next) ||
          (a.status === "completion_requested" && next === "confirmed")) &&
        !note
      )
        fail("Indica o motivo desta alteração.", "invalid-argument");
      const confirms = a.status === "accepted" && next === "confirmed";
      if ((confirms || next === "accepted") && !verified)
        fail("Confirma o email em Segurança da conta.", "permission-denied");
      const jobRef = db.doc(`jobs/${a.jobId}`),
        workerLock = db.doc(`workerSchedules/${a.workerId}`);
      const j = await tx.get(jobRef),
        job = j.data();
      if (!job) fail("Oferta indisponível.");
      const requiresSchedule =
        next === "accepted" ||
        confirms ||
        next === "completion_requested" ||
        next === "completed" ||
        next === "no_show";
      const s = requiresSchedule ? a.agreedTerms || schedule(job) : null,
        now = clock();
      if (next === "accepted" || confirms) {
        if (job.status !== "open" || s.startMs <= now)
          fail("O prazo para aceitar ou confirmar terminou.");
      }
      if (next === "completion_requested" || next === "completed") {
        if (s.endMs > now)
          fail("Só é possível concluir depois do fim do horário combinado.");
      }
      if (next === "no_show" && s.startMs > now)
        fail("Só podes marcar falta depois da hora de início do trabalho.");
      let attendance = null;
      if (next === "completion_requested") {
        const attStatus = data.attendance === "late" ? "late" : "present";
        let lateMinutes = 0;
        if (attStatus === "late") {
          lateMinutes = Number(data.lateMinutes);
          if (
            !Number.isInteger(lateMinutes) ||
            lateMinutes < 1 ||
            lateMinutes > 1440
          )
            fail("Indica os minutos de atraso.", "invalid-argument");
        }
        attendance = { status: attStatus, lateMinutes, at: Timestamp.fromMillis(now) };
      }
      // Every occupation/release takes the same job and worker lock, so concurrent
      // confirmations cannot oversubscribe either the job or the worker's calendar.
      const changesOccupation =
        confirms ||
        (a.status === "confirmed" && ["cancelled", "no_show"].includes(next));
      let filled;
      if (changesOccupation) {
        await tx.get(workerLock);
        const atJob = await tx.get(
          db.collection("engagements").where("jobId", "==", a.jobId),
        );
        filled = atJob.docs.filter((d) => occupied.has(d.data().status)).length;
        if (confirms) {
          if (filled >= job.vacancies) fail("A última vaga já foi preenchida.");
          const workerJobs = await tx.get(
            db.collection("engagements").where("workerId", "==", a.workerId),
          );
          for (const other of workerJobs.docs) {
            const b = other.data();
            if (other.id === snap.id || !occupied.has(b.status)) continue;
            let otherSchedule = b.agreedTerms;
            if (!otherSchedule) {
              const oldJob = await tx.get(db.doc(`jobs/${b.jobId}`));
              if (!oldJob.exists)
                fail(
                  "Há um trabalho anterior sem horário válido. Contacta o suporte antes de confirmar.",
                );
              otherSchedule = schedule(oldJob.data());
            }
            if (overlaps(s, otherSchedule))
              fail(
                "Já tens um trabalho confirmado que coincide com este horário.",
              );
          }
        }
      }
      const patch = {
        status: next,
        previousStatus: a.status,
        actorId: uid,
        note,
        statusUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (confirms)
        patch.agreedTerms = {
          ...s,
          date: job.date,
          startTime: job.startTime,
          endTime: job.endTime,
          rate: job.rate,
          payType: job.payType,
          paymentTerms: job.paymentTerms,
          location: job.location,
          district: job.district,
          acceptedAt: Timestamp.fromMillis(now),
          version: 1,
        };
      if (attendance) patch.attendance = attendance;
      tx.update(ref, patch);
      tx.create(ref.collection("events").doc(), {
        from: a.status,
        to: next,
        actorId: uid,
        note,
        at: FieldValue.serverTimestamp(),
      });
      // A reputação vive num documento público próprio, escrito só aqui no servidor.
      const bumpReputation = (fields) =>
        tx.set(
          db.doc(`reputations/${a.workerId}`),
          {
            workerId: a.workerId,
            ...fields,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      if (next === "completed")
        bumpReputation({ completed: FieldValue.increment(1) });
      if (next === "no_show")
        bumpReputation({ noShows: FieldValue.increment(1) });
      if (attendance?.status === "late")
        bumpReputation({ late: FieldValue.increment(1) });
      if (changesOccupation) {
        tx.update(jobRef, { filled: filled + (confirms ? 1 : -1) });
        tx.set(workerLock, { updatedAt: FieldValue.serverTimestamp() });
      }
    });
    return { id: ref.id, status: next };
  };
}
