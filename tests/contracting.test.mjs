import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createMarketplace } from "../functions/marketplace.js";
import { scheduleOf } from "../functions/schedule.js";
const requireFunctions = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp, deleteApp } = requireFunctions("firebase-admin/app");
const { getFirestore } = requireFunctions("firebase-admin/firestore");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
const app = initializeApp({ projectId: "demo-globalops" }, "contracting-tests");
const db = getFirestore(app);
let now = Date.parse("2090-01-01T00:00:00Z");
const api = createMarketplace(db, () => now);
const call = (uid, data, verified = true) =>
  api({ auth: { uid, token: { email_verified: verified } }, data });
const job = {
  title: "Mesa",
  category: "Mesa",
  district: "Lisboa",
  location: "Hotel",
  date: "2090-01-10",
  startTime: "18:00",
  endTime: "02:00",
  rate: 12,
  vacancies: 1,
  payType: "hour",
  paymentTerms: "15 dias",
  description: "Serviço de mesa",
  transport: "",
  meal: "",
  equipment: "",
};
const change = (uid, id, expected, next, note = "") =>
  call(uid, { operation: "transition", id, expected, next, note });
const rejected = (promise, pattern) =>
  assert.rejects(promise, (e) => {
    assert.match(e.message, pattern);
    return true;
  });
before(async () => {
  const response = await fetch(
    "http://127.0.0.1:8080/emulator/v1/projects/demo-globalops/databases/(default)/documents",
    { method: "DELETE" },
  );
  assert.equal(response.ok, true);
  for (const [uid, kind] of [
    ["company", "company"],
    ["worker", "worker"],
    ["other", "worker"],
    ["third", "worker"],
  ])
    await db.doc(`profiles/${uid}`).set({ kind, name: uid });
});
after(async () => {
  await db.terminate();
  await deleteApp(app);
});
test("server rejects forged identities, impossible dates, past shifts and invalid payment", async () => {
  await rejected(api({ data: { operation: "publish" } }), /Entra/);
  await rejected(
    call("worker", { operation: "publish", id: "forged", job }),
    /Só as empresas/,
  );
  await rejected(
    call("company", { operation: "publish", id: "unverified", job }, false),
    /Confirma/,
  );
  for (const invalid of [
    { date: "2080-01-01" },
    { date: "2090-02-30" },
    { startTime: "24:00" },
    { endTime: "18:00" },
    { vacancies: 1.5 },
    { rate: -1 },
  ]) {
    await assert.rejects(
      call("company", {
        operation: "publish",
        id: "bad",
        job: { ...job, ...invalid },
      }),
    );
  }
});
test("publication is retry-safe and keeps drafts when validation fails", async () => {
  const ref = db.doc("profiles/company/jobDrafts/draft");
  await ref.set({ form: job });
  await assert.rejects(
    call("company", {
      operation: "publish",
      id: "one",
      draftId: "draft",
      job: { ...job, rate: 0 },
    }),
  );
  assert.equal((await ref.get()).exists, true);
  await Promise.all(
    [1, 2].map(() =>
      call("company", {
        operation: "publish",
        id: "one",
        draftId: "draft",
        job,
      }),
    ),
  );
  assert.equal((await ref.get()).exists, false);
  assert.equal((await db.collection("jobs").get()).size, 1);
  assert.equal(
    (await db.doc("jobs/one").get()).data().timeZone,
    "Europe/Lisbon",
  );
});
test("applications cannot bypass opening times, verified email or job closure", async () => {
  await rejected(
    call("worker", { operation: "apply", jobId: "one", message: "" }, false),
    /Confirma/,
  );
  await db
    .doc("jobs/past")
    .set({ ...job, date: "2080-01-01", status: "open", companyId: "company" });
  await rejected(
    call("worker", { operation: "apply", jobId: "past", message: "" }),
    /terminou/,
  );
  await db
    .doc("jobs/closed")
    .set({ ...job, status: "closed", companyId: "company" });
  await rejected(
    call("worker", { operation: "apply", jobId: "closed", message: "" }),
    /encerrada/,
  );
  for (const uid of ["worker", "other"]) {
    await Promise.all(
      [1, 2].map(() =>
        call(uid, { operation: "apply", jobId: "one", message: "Disponível" }),
      ),
    );
    await change("company", `one_${uid}`, "pending", "accepted");
  }
  assert.equal((await db.collection("engagements").get()).size, 2);
});
let winner, loser;
test("two simultaneous confirmations compete for one vacancy without oversubscription", async () => {
  const results = await Promise.allSettled(
    ["worker", "other"].map((uid) =>
      change(uid, `one_${uid}`, "accepted", "confirmed"),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  winner = ["worker", "other"][
    results.findIndex((r) => r.status === "fulfilled")
  ];
  loser = winner === "worker" ? "other" : "worker";
  assert.equal((await db.doc("jobs/one").get()).data().filled, 1);
  const agreement = (await db.doc(`engagements/one_${winner}`).get()).data()
    .agreedTerms;
  assert.equal(agreement.rate, 12);
  assert.equal(agreement.paymentTerms, "15 dias");
  await change(winner, `one_${winner}`, "accepted", "confirmed");
  assert.equal((await db.doc("jobs/one").get()).data().filled, 1);
  assert.equal(
    (await db.collection(`engagements/one_${winner}/events`).get()).size,
    2,
  );
});
test("overnight overlaps blocked, adjacent shifts allowed, other accounts cannot impersonate a participant", async () => {
  for (const [id, startTime, endTime] of [
    ["overlap", "01:00", "03:00"],
    ["adjacent", "02:00", "05:00"],
  ]) {
    await call("company", {
      operation: "publish",
      id,
      job: { ...job, date: "2090-01-11", startTime, endTime },
    });
    await call(winner, { operation: "apply", jobId: id, message: "" });
    await change("company", `${id}_${winner}`, "pending", "accepted");
  }
  await rejected(
    change(winner, `overlap_${winner}`, "accepted", "confirmed"),
    /coincide/,
  );
  await change(winner, `adjacent_${winner}`, "accepted", "confirmed");
  await rejected(
    change("third", `one_${winner}`, "confirmed", "cancelled", "Não vou"),
    /indisponível/,
  );
  await rejected(
    change(winner, `one_${winner}`, "accepted", "cancelled", "Não vou"),
    /estado mudou/,
  );
});
test("cancellation atomically releases the vacancy and calendar; last spot can be taken afterwards", async () => {
  await rejected(
    change(winner, `one_${winner}`, "confirmed", "cancelled"),
    /motivo/,
  );
  await change(
    winner,
    `one_${winner}`,
    "confirmed",
    "cancelled",
    "Indisponibilidade",
  );
  assert.equal((await db.doc("jobs/one").get()).data().filled, 0);
  await change(loser, `one_${loser}`, "accepted", "confirmed");
  assert.equal((await db.doc("jobs/one").get()).data().filled, 1);
  // The cancelled period is free, though the adjacent confirmed period still blocks overlap.
  await call("company", { operation: "publish", id: "replacement", job });
  await call(winner, { operation: "apply", jobId: "replacement", message: "" });
  await change("company", `replacement_${winner}`, "pending", "accepted");
  await change(winner, `replacement_${winner}`, "accepted", "confirmed");
});
test("completion waits for agreed end time and still requires both participants", async () => {
  await rejected(
    change("company", `one_${loser}`, "confirmed", "completion_requested"),
    /depois do fim/,
  );
  await rejected(
    change(loser, `one_${loser}`, "confirmed", "completed"),
    /não é permitida/,
  );
  now = scheduleOf(job).endMs;
  await change("company", `one_${loser}`, "confirmed", "completion_requested");
  await change(
    loser,
    `one_${loser}`,
    "completion_requested",
    "confirmed",
    "Falta corrigir horas",
  );
  await change("company", `one_${loser}`, "confirmed", "completion_requested");
  await change(loser, `one_${loser}`, "completion_requested", "completed");
  assert.equal(
    (await db.doc(`engagements/one_${loser}`).get()).data().status,
    "completed",
  );
  assert.equal((await db.doc("jobs/one").get()).data().filled, 1);
});
test("the same worker cannot concurrently confirm overlapping offers even with separate companies/jobs", async () => {
  now = Date.parse("2090-01-01T00:00:00Z");
  for (const id of ["race-a", "race-b"]) {
    await call("company", {
      operation: "publish",
      id,
      job: { ...job, date: "2090-02-10" },
    });
    await call("third", { operation: "apply", jobId: id, message: "" });
    await change("company", `${id}_third`, "pending", "accepted");
  }
  const results = await Promise.allSettled(
    ["race-a", "race-b"].map((id) =>
      change("third", `${id}_third`, "accepted", "confirmed"),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
});

test('legacy migration is dry-run, idempotent, preserves malformed history and detects conflicts', async () => {
  const { spawnSync } = await import('node:child_process');
  await db.doc('jobs/legacy-invalid').set({ title: 'Histórico', status: 'closed', companyId: 'company' });
  const run = execute => {
    const result = spawnSync(process.execPath, ['scripts/migrate-contracting.mjs', '--project', 'demo-globalops', ...(execute ? ['--execute'] : [])], { encoding: 'utf8', env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' } });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  const preview = run(false);
  assert.equal(preview.invalidDates, 1);
  assert.equal(preview.updated, 0);
  assert.equal(preview.overCapacity, 0);
  assert.equal(preview.conflicts, 0);
  assert.ok(run(true).updated > 0);
  assert.equal(run(true).updated, 0);
  assert.equal((await db.doc('jobs/legacy-invalid').get()).data().title, 'Histórico');
  assert.equal((await db.doc('jobs/legacy-invalid').get()).data().startAt, undefined);
  await db.doc('engagements/legacy-extra').set({ jobId: 'one', workerId: 'legacy-worker', status: 'confirmed' });
  assert.equal(run(false).overCapacity, 1);
  const result = spawnSync(process.execPath, ['scripts/migrate-contracting.mjs','--project','demo-globalops','--execute'], { encoding:'utf8', env:{...process.env,FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'} });
  assert.notEqual(result.status, 0);
});
