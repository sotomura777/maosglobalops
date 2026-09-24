import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { deliver, sendReminders } from "../functions/mail.js";
const requireFunctions = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp, deleteApp } = requireFunctions("firebase-admin/app");
const { getFirestore } = requireFunctions("firebase-admin/firestore");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
const app = initializeApp({ projectId: "demo-globalops" }, "mail-tests");
const db = getFirestore(app);
const outbox = [];
const send = async (email, subject) => {
  outbox.push({ email, subject });
  return "sent";
};
before(async () => {
  const response = await fetch(
    "http://127.0.0.1:8080/emulator/v1/projects/demo-globalops/databases/(default)/documents",
    { method: "DELETE" },
  );
  assert.equal(response.ok, true);
  await db.doc("profiles/ana").set({ kind: "worker", name: "Ana", email: "ana@example.com" });
  await db.doc("profiles/rui").set({ kind: "worker", name: "Rui", email: "rui@example.com", emailNotifications: false });
  await db.doc("profiles/bad").set({ kind: "worker", name: "X", email: "x@example.com", suspended: true });
});
after(async () => {
  await db.terminate();
  await deleteApp(app);
});

test("the same event is emailed once, and the log never stores the address", async () => {
  outbox.length = 0;
  const notice = { uid: "ana", subject: "Foste selecionado(a)", text: "…" };
  assert.equal(await deliver(db, "evt-1", notice, send), "sent");
  assert.equal(await deliver(db, "evt-1", notice, send), "duplicate");
  assert.deepEqual(outbox, [{ email: "ana@example.com", subject: "Foste selecionado(a)" }]);
  const log = (await db.doc("mailLog/evt-1").get()).data();
  assert.equal(log.status, "sent");
  assert.equal(JSON.stringify(log).includes("ana@example.com"), false);
});

test("opted-out and suspended accounts get nothing; failures are recorded, not retried", async () => {
  outbox.length = 0;
  assert.equal(await deliver(db, "evt-2", { uid: "rui", subject: "s", text: "t" }, send), "opted_out");
  assert.equal(await deliver(db, "evt-3", { uid: "bad", subject: "s", text: "t" }, send), "skipped");
  assert.equal(await deliver(db, "evt-4", { uid: "ghost", subject: "s", text: "t" }, send), "skipped");
  assert.deepEqual(outbox, []);
  const boom = async () => {
    throw new Error("Resend 500");
  };
  assert.equal(await deliver(db, "evt-5", { uid: "ana", subject: "s", text: "t" }, boom), "failed");
  assert.equal(await deliver(db, "evt-5", { uid: "ana", subject: "s", text: "t" }, send), "duplicate");
});

test("the evening run reminds confirmed shifts starting 6-30h later, once", async () => {
  outbox.length = 0;
  const now = Date.parse("2090-05-01T17:00:00Z");
  const shift = (id, status, hours) =>
    db.doc(`engagements/${id}`).set({
      workerId: "ana",
      companyId: "c",
      companyName: "Aurora",
      title: id,
      status,
      agreedTerms: { startMs: now + hours * 3600000, date: "2090-05-02", startTime: "10:00", endTime: "18:00" },
    });
  await shift("tomorrow", "confirmed", 17);
  await shift("tonight", "confirmed", 3);
  await shift("next-week", "confirmed", 24 * 6);
  await shift("only-accepted", "accepted", 17);
  assert.equal(await sendReminders(db, send, now, "https://app"), 1);
  assert.deepEqual(outbox.map((m) => m.subject), ["Lembrete: tomorrow (2090-05-02, 10:00–18:00)"]);
  assert.equal(await sendReminders(db, send, now, "https://app"), 0);
});
