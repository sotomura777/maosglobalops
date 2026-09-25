import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createAdmin } from "../functions/admin.js";
import { createMarketplace } from "../functions/marketplace.js";
const requireFunctions = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp, deleteApp } = requireFunctions("firebase-admin/app");
const { getFirestore } = requireFunctions("firebase-admin/firestore");
const { getAuth } = requireFunctions("firebase-admin/auth");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
const app = initializeApp({ projectId: "demo-globalops" }, "admin-tests");
const db = getFirestore(app);
const auth = getAuth(app);
const admin = createAdmin(db, auth, () => Date.parse("2026-09-25T12:00:00Z"));
const market = createMarketplace(db, () => Date.parse("2090-01-01T00:00:00Z"));
const asAdmin = (data) =>
  admin({ auth: { uid: "boss", token: { admin: true } }, data });
const rejected = (promise, pattern) =>
  assert.rejects(promise, (e) => {
    assert.match(e.message, pattern);
    return true;
  });
before(async () => {
  for (const path of [
    "emulator/v1/projects/demo-globalops/databases/(default)/documents",
  ]) {
    const response = await fetch(`http://127.0.0.1:8080/${path}`, {
      method: "DELETE",
    });
    assert.equal(response.ok, true);
  }
  await fetch(
    "http://127.0.0.1:9099/emulator/v1/projects/demo-globalops/accounts",
    { method: "DELETE" },
  );
  for (const [uid, kind, email] of [
    ["boss", "worker", "boss@example.com"],
    ["acme", "company", "acme@example.com"],
    ["ana", "worker", "ana@example.com"],
  ]) {
    await auth.createUser({ uid, email, emailVerified: true });
    await db.doc(`profiles/${uid}`).set({
      kind,
      name: uid,
      email,
      public: true,
      createdAt: "2026-09-24T10:00:00.000Z",
    });
  }
  await auth.setCustomUserClaims("boss", { admin: true });
});
after(async () => {
  await db.terminate();
  await deleteApp(app);
});

test("only accounts carrying the admin claim reach any operation", async () => {
  for (const token of [{}, { admin: "true" }, { email_verified: true }])
    await rejected(
      admin({ auth: { uid: "ana", token }, data: { operation: "stats" } }),
      /administração/,
    );
  await rejected(admin({ data: { operation: "stats" } }), /administração/);
  await rejected(asAdmin({ operation: "dropDatabase" }), /inválida/);
});

test("stats count accounts, companies awaiting validation and engagements", async () => {
  const stats = await asAdmin({ operation: "stats" });
  assert.equal(stats.accounts.workers, 2);
  assert.equal(stats.accounts.companies, 1);
  assert.equal(stats.accounts.lastWeek, 3);
  assert.equal(stats.companies.pending, 1);
  assert.equal(stats.engagements.completed, 0);
  assert.equal(stats.reportsOpen, 0);
});

test("validating a company unlocks endorsements and is logged", async () => {
  await db.doc("profiles/ana/historyClaims/c1").set({
    title: "Bar",
    companyName: "acme",
    companyId: "acme",
    status: "pending",
    hours: 8,
  });
  const endorse = () =>
    market({
      auth: { uid: "acme", token: { email_verified: true } },
      data: { operation: "endorse", workerId: "ana", claimId: "c1", decision: "approve" },
    });
  await rejected(endorse(), /validada/);
  await rejected(
    asAdmin({ operation: "verifyCompany", uid: "ana", decision: "approve" }),
    /não é uma empresa/,
  );
  await asAdmin({ operation: "verifyCompany", uid: "acme", decision: "approve", note: "NIF confirmado" });
  const list = await asAdmin({ operation: "listCompanies" });
  assert.deepEqual(
    list.map((c) => [c.uid, c.verification, c.note]),
    [["acme", "verified", "NIF confirmado"]],
  );
  await endorse();
  assert.equal((await db.doc("workHistory/ana_c1").get()).data().companyVerified, true);
  const log = await db.collection("adminLog").where("target", "==", "acme").get();
  assert.equal(log.size, 1);
  assert.equal(log.docs[0].data().actorId, "boss");
});

test("suspension blocks login and server operations, and can be undone", async () => {
  await rejected(
    asAdmin({ operation: "suspendUser", uid: "ana", note: "" }),
    /campos/,
  );
  await rejected(
    asAdmin({ operation: "suspendUser", uid: "boss", note: "x" }),
    /própria conta/,
  );
  await asAdmin({ operation: "suspendUser", uid: "ana", note: "Assédio em mensagens" });
  assert.equal((await auth.getUser("ana")).disabled, true);
  const found = await asAdmin({ operation: "findUser", email: "ANA@example.com" });
  assert.equal(found.suspended, true);
  assert.equal(found.disabled, true);
  assert.equal((await db.doc("publicProfiles/ana").get()).data().public, false);
  // A token issued before the suspension no longer works on the server.
  await rejected(
    market({
      auth: { uid: "ana", token: { email_verified: true } },
      data: { operation: "apply", jobId: "whatever", message: "" },
    }),
    /suspensa/,
  );
  await asAdmin({ operation: "unsuspendUser", uid: "ana" });
  assert.equal((await auth.getUser("ana")).disabled, false);
  assert.equal((await db.doc("profiles/ana").get()).data().suspended, false);
  assert.equal(await asAdmin({ operation: "findUser", email: "nobody@example.com" }), null);
});

test("reports are listed with context, resolved with a note and can close the job", async () => {
  await db.doc("jobs/j1").set({ title: "Bar no festival", companyId: "acme", companyName: "acme", status: "open" });
  await db.doc("engagements/e1").set({ workerId: "ana", companyId: "acme", status: "confirmed" });
  await db.doc("engagements/e1/messages/m1").set({ senderId: "acme", text: "Paga-me 50€ para ficar com a vaga", createdAt: new Date() });
  const base = { reporterId: "ana", reason: "fraude", text: "Burla", status: "open" };
  await db.doc("reports/ana_job_j1").set({ ...base, targetType: "job", targetId: "j1", createdAt: new Date(1000) });
  await db.doc("reports/ana_message_m1").set({ ...base, targetType: "message", targetId: "m1", engagementId: "e1", createdAt: new Date(2000) });
  assert.equal((await asAdmin({ operation: "stats" })).reportsOpen, 2);
  const open = await asAdmin({ operation: "listReports", status: "open" });
  assert.deepEqual(open.map((r) => r.id), ["ana_message_m1", "ana_job_j1"]);
  const [message, job] = open;
  assert.equal(message.target.text, "Paga-me 50€ para ficar com a vaga");
  assert.equal(message.target.ownerId, "acme");
  assert.equal(message.reporter.email, "ana@example.com");
  assert.equal(job.target.title, "Bar no festival");
  assert.equal(job.target.ownerId, "acme");
  await asAdmin({ operation: "closeJob", jobId: "j1", note: "Oferta fraudulenta" });
  assert.equal((await db.doc("jobs/j1").get()).data().status, "closed");
  await rejected(asAdmin({ operation: "resolveReport", id: "ana_job_j1", note: "" }), /campos/);
  await asAdmin({ operation: "resolveReport", id: "ana_job_j1", note: "Oferta encerrada" });
  const resolved = (await db.doc("reports/ana_job_j1").get()).data();
  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.resolvedBy, "boss");
  assert.deepEqual(
    (await asAdmin({ operation: "listReports", status: "resolved" })).map((r) => r.id),
    ["ana_job_j1"],
  );
  assert.equal((await asAdmin({ operation: "stats" })).reportsOpen, 1);
});

test("only validated companies get an own-app link, always over https", async () => {
  await db.doc("profiles/newco").set({ kind: "company", name: "Nova", email: "n@example.com" });
  await rejected(
    asAdmin({ operation: "setCompanyApp", uid: "newco", name: "NovaOps", url: "https://novaops.example" }),
    /Valida primeiro/,
  );
  await rejected(
    asAdmin({ operation: "setCompanyApp", uid: "acme", name: "AcmeOps", url: "http://acme.example" }),
    /https/,
  );
  await asAdmin({ operation: "setCompanyApp", uid: "acme", name: "AcmeOps", url: "https://acme.example" });
  // Reviewing the validation again keeps the app link.
  await asAdmin({ operation: "verifyCompany", uid: "acme", decision: "approve", note: "Revisto" });
  let acme = (await asAdmin({ operation: "listCompanies" })).find((c) => c.uid === "acme");
  assert.deepEqual(acme.app, { name: "AcmeOps", url: "https://acme.example" });
  await asAdmin({ operation: "setCompanyApp", uid: "acme", name: "" });
  acme = (await asAdmin({ operation: "listCompanies" })).find((c) => c.uid === "acme");
  assert.equal(acme.app, null);
});
