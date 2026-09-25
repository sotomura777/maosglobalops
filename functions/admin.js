import { AggregateField, FieldValue } from "firebase-admin/firestore";
import { fail, text, id } from "./marketplace.js";
const STATUSES = [
  "pending",
  "accepted",
  "confirmed",
  "completion_requested",
  "completed",
  "rejected",
  "cancelled",
  "no_show",
];
const count = async (query) => (await query.count().get()).data().count;
// Operações da conta de administração. A claim 'admin' só é posta por scripts/set-admin.mjs.
export function createAdmin(db, auth, clock = Date.now) {
  const log = (batch, actorId, operation, target, note = "") =>
    batch.set(db.collection("adminLog").doc(), {
      actorId,
      operation,
      target,
      note,
      at: FieldValue.serverTimestamp(),
    });
  return async ({ auth: caller, data }) => {
    if (caller?.token?.admin !== true)
      fail("Acesso reservado à administração.", "permission-denied");
    const actorId = caller.uid;
    const operation = data?.operation;
    if (operation === "stats") {
      const profiles = db.collection("profiles"),
        jobs = db.collection("jobs"),
        engagements = db.collection("engagements");
      const weekAgo = new Date(clock() - 7 * 86400000).toISOString();
      const [workers, companies, verified, rejected, suspended, recent] =
        await Promise.all([
          count(profiles.where("kind", "==", "worker")),
          count(profiles.where("kind", "==", "company")),
          count(db.collection("companyStatus").where("verification", "==", "verified")),
          count(db.collection("companyStatus").where("verification", "==", "rejected")),
          count(profiles.where("suspended", "==", true)),
          count(profiles.where("createdAt", ">=", weekAgo)),
        ]);
      const [open, closed, reportsOpen, byStatus, rep] = await Promise.all([
        count(jobs.where("status", "==", "open")),
        count(jobs.where("status", "==", "closed")),
        count(db.collection("reports").where("status", "==", "open")),
        Promise.all(STATUSES.map((s) => count(engagements.where("status", "==", s)))),
        db
          .collection("reputations")
          .aggregate({
            noShows: AggregateField.sum("noShows"),
            late: AggregateField.sum("late"),
            cancellationsTotal: AggregateField.sum("cancellationsTotal"),
            cancellationsLate: AggregateField.sum("cancellationsLate"),
          })
          .get(),
      ]);
      return {
        accounts: { workers, companies, suspended, lastWeek: recent },
        companies: { verified, rejected, pending: companies - verified - rejected },
        jobs: { open, closed },
        engagements: Object.fromEntries(STATUSES.map((s, i) => [s, byStatus[i]])),
        reliability: rep.data(),
        reportsOpen,
      };
    }
    if (operation === "listCompanies") {
      const snap = await db
        .collection("profiles")
        .where("kind", "==", "company")
        .limit(500)
        .get();
      const statuses = snap.empty
        ? []
        : await db.getAll(...snap.docs.map((d) => db.doc(`companyStatus/${d.id}`)));
      return snap.docs.map((d, i) => {
        const p = d.data();
        return {
          uid: d.id,
          name: p.name || "",
          companyLegalName: p.companyLegalName || "",
          website: p.website || "",
          email: p.email || "",
          createdAt: p.createdAt || "",
          suspended: p.suspended === true,
          verification: statuses[i].data()?.verification || "pending",
          app: statuses[i].data()?.app || null,
          note: p.companyVerificationNote || "",
        };
      });
    }
    if (operation === "verifyCompany") {
      const uid = id(data.uid);
      const decision = data.decision === "approve" ? "verified" : "rejected";
      const note = text(data.note ?? "", 500);
      const profile = await db.doc(`profiles/${uid}`).get();
      if (profile.data()?.kind !== "company")
        fail("Esta conta não é uma empresa.", "invalid-argument");
      const batch = db.batch();
      // merge: rever a validação não pode apagar a app própria já configurada.
      batch.set(
        db.doc(`companyStatus/${uid}`),
        { verification: decision, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      batch.update(profile.ref, { companyVerificationNote: note });
      log(batch, actorId, operation, uid, `${decision} ${note}`.trim());
      await batch.commit();
      return { ok: true, verification: decision };
    }
    if (operation === "setCompanyApp") {
      const uid = id(data.uid);
      const name = text(data.name ?? "", 60);
      const url = text(data.url ?? "", 300);
      if (name && !/^https:\/\/[^\s]+$/.test(url))
        fail("Indica o endereço da app, a começar por https://", "invalid-argument");
      const ref = db.doc(`companyStatus/${uid}`);
      if ((await ref.get()).data()?.verification !== "verified")
        fail("Valida primeiro a empresa.");
      const batch = db.batch();
      batch.update(ref, { app: name ? { name, url } : FieldValue.delete() });
      log(batch, actorId, operation, uid, name ? `${name} ${url}` : "sem app");
      await batch.commit();
      return { ok: true };
    }
    if (operation === "findUser") {
      const email = text(data.email, 320, true).toLowerCase();
      let user;
      try {
        user = await auth.getUserByEmail(email);
      } catch (e) {
        if (e.code === "auth/user-not-found") return null;
        throw e;
      }
      const p = (await db.doc(`profiles/${user.uid}`).get()).data() || {};
      return {
        uid: user.uid,
        email: user.email || "",
        name: p.name || "",
        kind: p.kind || "",
        disabled: user.disabled === true,
        suspended: p.suspended === true,
        note: p.suspendedNote || "",
        admin: user.customClaims?.admin === true,
      };
    }
    if (operation === "suspendUser" || operation === "unsuspendUser") {
      const uid = id(data.uid);
      const suspend = operation === "suspendUser";
      const note = text(data.note ?? "", 500, suspend);
      if (uid === actorId) fail("Não podes suspender a tua própria conta.");
      const user = await auth.getUser(uid);
      if (user.customClaims?.admin === true)
        fail("Retira primeiro o acesso de administração a esta conta.");
      await auth.updateUser(uid, { disabled: suspend });
      if (suspend) await auth.revokeRefreshTokens(uid);
      const batch = db.batch();
      batch.set(
        db.doc(`profiles/${uid}`),
        {
          suspended: suspend,
          suspendedNote: note,
          suspendedAt: suspend ? FieldValue.serverTimestamp() : null,
          // Uma conta suspensa sai do diretório; ao reativar, o titular decide se volta a aparecer.
          ...(suspend ? { public: false } : {}),
        },
        { merge: true },
      );
      if (suspend)
        batch.set(db.doc(`publicProfiles/${uid}`), { public: false }, { merge: true });
      log(batch, actorId, operation, uid, note);
      await batch.commit();
      return { ok: true };
    }
    if (operation === "listReports") {
      const status = data.status === "resolved" ? "resolved" : "open";
      const snap = await db
        .collection("reports")
        .where("status", "==", status)
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      const nameOf = async (uid) => {
        const p = uid ? (await db.doc(`profiles/${uid}`).get()).data() : null;
        return { uid: uid || "", name: p?.name || "", email: p?.email || "" };
      };
      return Promise.all(
        snap.docs.map(async (d) => {
          const r = d.data();
          let target = { ownerId: "" };
          if (r.targetType === "profile") {
            const who = await nameOf(r.targetId);
            target = { ownerId: r.targetId, name: who.name };
          } else if (r.targetType === "job") {
            const j = (await db.doc(`jobs/${r.targetId}`).get()).data();
            target = {
              ownerId: j?.companyId || "",
              title: j?.title || "Oferta removida",
              name: j?.companyName || "",
              status: j?.status || "",
            };
          } else if (r.targetType === "message" && r.engagementId) {
            const m = (
              await db.doc(`engagements/${r.engagementId}/messages/${r.targetId}`).get()
            ).data();
            const who = await nameOf(m?.senderId);
            target = {
              ownerId: m?.senderId || "",
              name: who.name,
              text: m?.text || "Mensagem indisponível",
              engagementId: r.engagementId,
            };
          }
          return {
            id: d.id,
            targetType: r.targetType,
            targetId: r.targetId,
            reason: r.reason,
            text: r.text || "",
            createdAt: r.createdAt?.toMillis?.() || 0,
            resolution: r.resolution || "",
            reporter: await nameOf(r.reporterId),
            target,
          };
        }),
      );
    }
    if (operation === "resolveReport") {
      const ref = db.doc(`reports/${id(data.id)}`);
      const note = text(data.note ?? "", 1000, true);
      if (!(await ref.get()).exists) fail("Denúncia indisponível.", "not-found");
      const batch = db.batch();
      batch.update(ref, {
        status: "resolved",
        resolution: note,
        resolvedBy: actorId,
        resolvedAt: FieldValue.serverTimestamp(),
      });
      log(batch, actorId, operation, ref.id, note);
      await batch.commit();
      return { ok: true };
    }
    if (operation === "closeJob") {
      const ref = db.doc(`jobs/${id(data.jobId)}`);
      const note = text(data.note ?? "", 500, true);
      const job = await ref.get();
      if (!job.exists) fail("Oferta indisponível.", "not-found");
      const batch = db.batch();
      // As candidaturas e o histórico mantêm-se; só deixa de receber candidaturas.
      if (job.data().status === "open") batch.update(ref, { status: "closed" });
      log(batch, actorId, operation, ref.id, note);
      await batch.commit();
      return { ok: true };
    }
    fail("Operação inválida.", "invalid-argument");
  };
}
