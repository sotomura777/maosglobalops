import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createAccount } from "../functions/account.js";
const requireFunctions = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp, deleteApp } = requireFunctions("firebase-admin/app");
const { getFirestore } = requireFunctions("firebase-admin/firestore");
const { getAuth } = requireFunctions("firebase-admin/auth");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
const app = initializeApp({ projectId: "demo-globalops" }, "account-tests");
const db = getFirestore(app);
const auth = getAuth(app);
const now = Date.parse("2026-09-25T12:00:00Z");
const account = createAccount(db, auth, () => now);
// auth_time is in seconds; a fresh login happened a minute ago.
const as = (uid, data, authTime = now / 1000 - 60) =>
  account({ auth: { uid, token: { auth_time: authTime } }, data });
const rejected = (promise, pattern) =>
  assert.rejects(promise, (e) => {
    assert.match(e.message, pattern);
    return true;
  });
before(async () => {
  assert.equal(
    (
      await fetch(
        "http://127.0.0.1:8080/emulator/v1/projects/demo-globalops/databases/(default)/documents",
        { method: "DELETE" },
      )
    ).ok,
    true,
  );
  await fetch("http://127.0.0.1:9099/emulator/v1/projects/demo-globalops/accounts", {
    method: "DELETE",
  });
  for (const [uid, kind, email] of [
    ["maria", "worker", "maria@example.com"],
    ["loja", "company", "loja@example.com"],
  ]) {
    await auth.createUser({ uid, email, emailVerified: true });
    await db.doc(`profiles/${uid}`).set({ kind, name: uid, email, phone: "910000000" });
    await db.doc(`publicProfiles/${uid}`).set({ kind, name: uid, public: true });
  }
  await db.doc("profiles/maria/worklog/w1").set({ date: "2026-09-01", hours: 5, rate: 10 });
  await db.doc("reputations/maria").set({ workerId: "maria", completed: 1 });
  await db.doc("workHistory/e-done").set({ workerId: "maria", companyId: "loja", companyName: "loja" });
  const engagement = (id, status) =>
    db.doc(`engagements/${id}`).set({
      jobId: "j1",
      workerId: "maria",
      workerName: "maria",
      companyId: "loja",
      companyName: "loja",
      title: "Bar",
      status,
    });
  await engagement("e-done", "completed");
  await engagement("e-pend", "pending");
  await engagement("e-act", "confirmed");
  await db.doc("engagements/e-done/messages/m1").set({ senderId: "maria", text: "Olá" });
  await db.doc("reviews/e-done_loja").set({ authorId: "loja", subjectId: "maria", rating: 5 });
  await db.doc("reviews/e-done_maria").set({ authorId: "maria", subjectId: "loja", rating: 4 });
  await db.doc("channels/t-geral/posts/p1").set({ authorId: "maria", text: "Olá a todos" });
  await db.doc("reports/maria_profile_loja").set({ reporterId: "maria", targetType: "profile", targetId: "loja" });
});
after(async () => {
  await db.terminate();
  await deleteApp(app);
});

test("export returns the person's own data, and only theirs", async () => {
  await rejected(account({ data: { operation: "exportData" } }), /Entra na tua conta/);
  const data = await as("maria", { operation: "exportData" });
  assert.equal(data.profile.email, "maria@example.com");
  assert.equal(data.subcollections.worklog.length, 1);
  assert.deepEqual(data.engagements.map((e) => e.id).sort(), ["e-act", "e-done", "e-pend"]);
  assert.equal(data.engagements.find((e) => e.id === "e-done").messages.length, 1);
  assert.equal(data.reviewsReceived.length, 1);
  assert.equal(data.reviewsWritten.length, 1);
  // Nothing private from the other party leaks into the export.
  assert.equal(JSON.stringify(data).includes("loja@example.com"), false);
});

test("deleting is refused with pending work or an old login", async () => {
  await rejected(as("maria", { operation: "deleteAccount" }), /Cancela primeiro/);
  await db.doc("engagements/e-act").update({ status: "cancelled" });
  await rejected(
    as("maria", { operation: "deleteAccount" }, now / 1000 - 3600),
    /volta a entrar/,
  );
});

test("deleting removes the person and anonymises what the other party keeps", async () => {
  await as("maria", { operation: "deleteAccount", reason: "Já não preciso" });
  for (const path of [
    "profiles/maria",
    "profiles/maria/worklog/w1",
    "publicProfiles/maria",
    "reputations/maria",
    "workHistory/e-done",
    "reviews/e-done_loja",
    "channels/t-geral/posts/p1",
  ])
    assert.equal((await db.doc(path).get()).exists, false, path);
  // The company keeps its record of the job, without the person's name.
  const done = (await db.doc("engagements/e-done").get()).data();
  assert.equal(done.workerName, "Conta apagada");
  assert.equal(done.status, "completed");
  const pending = (await db.doc("engagements/e-pend").get()).data();
  assert.equal(pending.status, "cancelled");
  assert.equal(pending.note, "Conta apagada");
  // What the person wrote about others stays, without identifying them further.
  assert.equal((await db.doc("reviews/e-done_maria").get()).exists, true);
  assert.equal((await db.doc("reports/maria_profile_loja").get()).data().reporterId, "deleted");
  await assert.rejects(auth.getUser("maria"), /no user record|not found/i);
  // The other account is untouched.
  assert.equal((await db.doc("profiles/loja").get()).data().email, "loja@example.com");
});
