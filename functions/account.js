import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { fail, text } from "./marketplace.js";
// Direitos RGPD do titular: descarregar os seus dados e apagar a conta.
const ACTIVE = ["accepted", "confirmed", "completion_requested"];
const SUBCOLLECTIONS = ["worklog", "jobDrafts", "savedJobs", "readEvents", "historyClaims", "favorites"];
const GONE = "Conta apagada";
const RECENT_LOGIN_S = 10 * 60;

// Datas do Firestore passam a texto legível no ficheiro exportado.
const plain = (value) => {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
  return value;
};
const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...plain(d.data()) }));

export function createAccount(db, auth, clock = Date.now) {
  const where = (collection, field, uid) =>
    db.collection(collection).where(field, "==", uid).get();
  const engagementsOf = async (uid) => {
    const [asWorker, asCompany] = await Promise.all([
      where("engagements", "workerId", uid),
      where("engagements", "companyId", uid),
    ]);
    return [...asWorker.docs, ...asCompany.docs];
  };
  // Escritas em blocos, abaixo do limite de 500 por lote.
  const inBatches = async (ops) => {
    for (let i = 0; i < ops.length; i += 400) {
      const batch = db.batch();
      ops.slice(i, i + 400).forEach((op) => op(batch));
      await batch.commit();
    }
  };

  async function exportData(uid) {
    const profileRef = db.doc(`profiles/${uid}`);
    const [profile, publicProfile, reputation] = await Promise.all([
      profileRef.get(),
      db.doc(`publicProfiles/${uid}`).get(),
      db.doc(`reputations/${uid}`).get(),
    ]);
    const subcollections = {};
    for (const name of SUBCOLLECTIONS)
      subcollections[name] = rows(await profileRef.collection(name).get());
    const engagements = [];
    for (const d of await engagementsOf(uid)) {
      const [events, messages] = await Promise.all([
        d.ref.collection("events").get(),
        d.ref.collection("messages").get(),
      ]);
      engagements.push({ id: d.id, ...plain(d.data()), events: rows(events), messages: rows(messages) });
    }
    const [written, received, history, validations, handoversW, handoversC, invitations, reports, jobs] =
      await Promise.all([
        where("reviews", "authorId", uid),
        where("reviews", "subjectId", uid),
        where("workHistory", "workerId", uid),
        where("validations", "workerId", uid),
        where("handovers", "workerId", uid),
        where("handovers", "companyId", uid),
        where("invitations", "workerId", uid),
        where("reports", "reporterId", uid),
        where("jobs", "companyId", uid),
      ]);
    return {
      exportedAt: new Date(clock()).toISOString(),
      profile: plain(profile.data() || null),
      publicProfile: plain(publicProfile.data() || null),
      subcollections,
      engagements,
      reviewsWritten: rows(written),
      reviewsReceived: rows(received),
      reputation: plain(reputation.data() || null),
      workHistory: rows(history),
      validations: rows(validations),
      handovers: [...rows(handoversW), ...rows(handoversC)],
      invitations: rows(invitations),
      reportsMade: rows(reports),
      jobsPublished: rows(jobs),
    };
  }

  async function deleteAccount(uid, token, reason) {
    // Apagar é irreversível: exige um login recente, como pedir a password outra vez.
    if (!(clock() / 1000 - (token?.auth_time || 0) <= RECENT_LOGIN_S))
      fail("Por segurança, sai e volta a entrar antes de apagar a conta.");
    const engagements = await engagementsOf(uid);
    const active = engagements.filter((d) => ACTIVE.includes(d.data().status));
    if (active.length)
      fail(
        `Cancela primeiro ${active.length === 1 ? "o trabalho em curso" : `os ${active.length} trabalhos em curso`} em Os meus trabalhos.`,
      );
    const ops = [];
    for (const d of engagements) {
      const a = d.data();
      const patch = a.workerId === uid ? { workerName: GONE } : { companyName: GONE };
      if (a.status === "pending")
        Object.assign(patch, {
          status: "cancelled",
          previousStatus: "pending",
          actorId: uid,
          note: GONE,
          statusUpdatedAt: FieldValue.serverTimestamp(),
        });
      ops.push((b) => b.update(d.ref, patch));
    }
    const [jobs, received, reports, history, companyHistory, validations, handoversW, handoversC, invitesW, invitesC, quotas, posts] =
      await Promise.all([
        where("jobs", "companyId", uid),
        where("reviews", "subjectId", uid),
        where("reports", "reporterId", uid),
        where("workHistory", "workerId", uid),
        where("workHistory", "companyId", uid),
        where("validations", "workerId", uid),
        where("handovers", "workerId", uid),
        where("handovers", "companyId", uid),
        where("invitations", "workerId", uid),
        where("invitations", "companyId", uid),
        where("quotas", "uid", uid),
        db.collectionGroup("posts").where("authorId", "==", uid).get(),
      ]);
    for (const d of jobs.docs)
      ops.push((b) =>
        b.update(d.ref, {
          companyName: GONE,
          ...(d.data().status === "open" ? { status: "closed" } : {}),
        }),
      );
    for (const d of reports.docs) ops.push((b) => b.update(d.ref, { reporterId: "deleted" }));
    for (const d of companyHistory.docs) ops.push((b) => b.update(d.ref, { companyName: GONE }));
    for (const snap of [received, history, validations, handoversW, handoversC, invitesW, invitesC, quotas, posts])
      for (const d of snap.docs) ops.push((b) => b.delete(d.ref));
    for (const path of [`publicProfiles/${uid}`, `reputations/${uid}`, `companyStatus/${uid}`, `workerSchedules/${uid}`])
      ops.push((b) => b.delete(db.doc(path)));
    ops.push((b) =>
      b.set(db.collection("adminLog").doc(), {
        actorId: uid,
        operation: "selfDelete",
        target: uid,
        note: reason,
        at: FieldValue.serverTimestamp(),
      }),
    );
    await inBatches(ops);
    await db.recursiveDelete(db.doc(`channels/c-${uid}`));
    await db.recursiveDelete(db.doc(`profiles/${uid}`));
    await auth.deleteUser(uid);
    return { ok: true };
  }

  return async ({ auth: caller, data }) => {
    if (!caller?.uid) fail("Entra na tua conta.", "unauthenticated");
    if (data?.operation === "exportData") return exportData(caller.uid);
    if (data?.operation === "deleteAccount")
      return deleteAccount(caller.uid, caller.token, text(data.reason ?? "", 300));
    fail("Operação inválida.", "invalid-argument");
  };
}
