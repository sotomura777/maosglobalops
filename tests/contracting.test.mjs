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

test("company marks attendance and no-shows, feeding the worker's server-only reputation", async () => {
  now = Date.parse("2090-01-01T00:00:00Z");
  const late = { ...job, date: "2090-06-10" };
  await call("company", { operation: "publish", id: "att", job: late });
  await call("third", { operation: "apply", jobId: "att", message: "" });
  await change("company", "att_third", "pending", "accepted");
  await change("third", "att_third", "accepted", "confirmed");
  await rejected(
    call("company", {
      operation: "transition",
      id: "att_third",
      expected: "confirmed",
      next: "no_show",
      note: "Não veio",
    }),
    /depois da hora/,
  );
  now = scheduleOf(late).endMs;
  await call("company", {
    operation: "transition",
    id: "att_third",
    expected: "confirmed",
    next: "completion_requested",
    note: "",
    attendance: "late",
    lateMinutes: 20,
  });
  const att = (await db.doc("engagements/att_third").get()).data().attendance;
  assert.equal(att.status, "late");
  assert.equal(att.lateMinutes, 20);
  await change("third", "att_third", "completion_requested", "completed");
  const rep = (await db.doc("reputations/third").get()).data();
  assert.equal(rep.completed, 1);
  assert.equal(rep.late, 1);
  const hist = (await db.doc("workHistory/att_third").get()).data();
  assert.equal(hist.verified, true);
  assert.equal(hist.source, "app");
  assert.equal(hist.workerId, "third");
  assert.ok(hist.hours > 0);

  now = Date.parse("2090-01-01T00:00:00Z");
  const miss = { ...job, date: "2090-07-10" };
  await call("company", { operation: "publish", id: "miss", job: miss });
  await call("third", { operation: "apply", jobId: "miss", message: "" });
  await change("company", "miss_third", "pending", "accepted");
  await change("third", "miss_third", "accepted", "confirmed");
  assert.equal((await db.doc("jobs/miss").get()).data().filled, 1);
  await rejected(
    change("third", "miss_third", "confirmed", "no_show", "x"),
    /não é permitida/,
  );
  now = scheduleOf(miss).startMs;
  await rejected(
    call("company", {
      operation: "transition",
      id: "miss_third",
      expected: "confirmed",
      next: "no_show",
      note: "",
    }),
    /motivo/,
  );
  await call("company", {
    operation: "transition",
    id: "miss_third",
    expected: "confirmed",
    next: "no_show",
    note: "Não compareceu",
  });
  assert.equal(
    (await db.doc("engagements/miss_third").get()).data().status,
    "no_show",
  );
  assert.equal((await db.doc("jobs/miss").get()).data().filled, 0);
  assert.equal((await db.doc("reputations/third").get()).data().noShows, 1);
});

test("only a worker's cancellation after confirmation counts, and late ones are flagged", async () => {
  now = Date.parse("2099-01-01T00:00:00Z");
  const read = async () => (await db.doc("reputations/worker").get()).data() || {};
  const before = await read();
  const base = {
    total: before.cancellationsTotal || 0,
    late: before.cancellationsLate || 0,
  };
  const confirm = async (id, date) => {
    await call("company", { operation: "publish", id, job: { ...job, date } });
    await call("worker", { operation: "apply", jobId: id, message: "" });
    await change("company", `${id}_worker`, "pending", "accepted");
    await change("worker", `${id}_worker`, "accepted", "confirmed");
  };
  // Withdrawing before confirmation does not count.
  await call("company", {
    operation: "publish",
    id: "c-early",
    job: { ...job, date: "2099-03-10" },
  });
  await call("worker", { operation: "apply", jobId: "c-early", message: "" });
  await change("worker", "c-early_worker", "pending", "cancelled", "Mudei de ideias");
  // A company cancellation does not count against the worker.
  await confirm("c-comp", "2099-04-10");
  await change("company", "c-comp_worker", "confirmed", "cancelled", "Sem necessidade");
  assert.equal((await read()).cancellationsTotal || 0, base.total);
  // Worker cancels a confirmed job far from the start: counts, not late.
  await confirm("c-far", "2099-05-10");
  await change("worker", "c-far_worker", "confirmed", "cancelled", "Indisponível");
  let rep = await read();
  assert.equal(rep.cancellationsTotal, base.total + 1);
  assert.equal(rep.cancellationsLate || 0, base.late);
  // Worker cancels within 24h of the start: counts and is flagged late.
  await confirm("c-late", "2099-06-10");
  now = scheduleOf({ ...job, date: "2099-06-10" }).startMs - 3 * 3600000;
  await change("worker", "c-late_worker", "confirmed", "cancelled", "Emergência");
  rep = await read();
  assert.equal(rep.cancellationsTotal, base.total + 2);
  assert.equal(rep.cancellationsLate, base.late + 1);
});

test("companies confirm or reject a worker's declared past job", async () => {
  const claimRef = db.doc("profiles/worker/historyClaims/past1");
  await claimRef.set({
    title: "Bar",
    companyName: "Festival X",
    companyId: "company",
    status: "pending",
    date: "2088-05-01",
    hours: 6,
  });
  const endorse = (uid, workerId, claimId, decision) =>
    call(uid, { operation: "endorse", workerId, claimId, decision });
  // A non-company account cannot confirm.
  await rejected(endorse("other", "worker", "past1", "approve"), /empresas/);
  // A different company cannot confirm a request addressed elsewhere.
  await db.doc("profiles/worker/historyClaims/other-co").set({
    title: "X",
    companyName: "Y",
    companyId: "stranger-co",
    status: "pending",
  });
  await rejected(
    endorse("company", "worker", "other-co", "approve"),
    /indisponível/,
  );
  // The targeted company confirms: the claim is verified and public history is written.
  await endorse("company", "worker", "past1", "approve");
  assert.equal((await claimRef.get()).data().status, "verified");
  const wh = (await db.doc("workHistory/worker_past1").get()).data();
  assert.equal(wh.verified, true);
  assert.equal(wh.source, "external");
  assert.equal(wh.approvedBy, "company");
  // Repeating the decision is inert.
  await endorse("company", "worker", "past1", "approve");
  // Rejection drops the request back to self-declared and writes no history.
  const claim2 = db.doc("profiles/worker/historyClaims/past2");
  await claim2.set({
    title: "Mesa",
    companyName: "Festival X",
    companyId: "company",
    status: "pending",
  });
  await endorse("company", "worker", "past2", "reject");
  assert.equal((await claim2.get()).data().status, "rejected");
  assert.equal((await db.doc("workHistory/worker_past2").get()).exists, false);
  // Hours and dates outside sane bounds are never copied into verified history.
  for (const [cid, extra] of [
    ["bad-hours", { hours: 1e9 }],
    ["neg-hours", { hours: -3 }],
    ["bad-date", { date: "ontem" }],
  ]) {
    await db.doc(`profiles/worker/historyClaims/${cid}`).set({
      title: "Bar",
      companyName: "Festival X",
      companyId: "company",
      status: "pending",
      ...extra,
    });
    await rejected(endorse("company", "worker", cid, "approve"), /inválido/);
    assert.equal((await db.doc(`workHistory/worker_${cid}`).get()).exists, false);
  }
});

test("a late arrival counts once, using the company's final mark", async () => {
  now = Date.parse("2091-01-01T00:00:00Z");
  const shift = { ...job, date: "2091-03-10" };
  await call("company", { operation: "publish", id: "loop", job: shift });
  await call("other", { operation: "apply", jobId: "loop", message: "" });
  await change("company", "loop_other", "pending", "accepted");
  await change("other", "loop_other", "accepted", "confirmed");
  now = scheduleOf(shift).endMs;
  const request = (attendance) =>
    call("company", {
      operation: "transition",
      id: "loop_other",
      expected: "confirmed",
      next: "completion_requested",
      note: "",
      attendance,
      lateMinutes: attendance === "late" ? 30 : undefined,
    });
  // Company marks late twice while the worker disputes the request in between.
  await request("late");
  await change("other", "loop_other", "completion_requested", "confirmed", "Cheguei a horas");
  await request("late");
  const rep = async () => (await db.doc("reputations/other").get()).data() || {};
  assert.equal((await rep()).late || 0, 0);
  await change("other", "loop_other", "completion_requested", "completed");
  assert.equal((await rep()).late, 1);
});

test("after the shift starts a confirmed job can no longer be cancelled", async () => {
  now = Date.parse("2092-01-01T00:00:00Z");
  const shift = { ...job, date: "2092-03-10" };
  await call("company", { operation: "publish", id: "started", job: shift });
  await call("other", { operation: "apply", jobId: "started", message: "" });
  await change("company", "started_other", "pending", "accepted");
  await change("other", "started_other", "accepted", "confirmed");
  now = scheduleOf(shift).startMs + 60000;
  await rejected(
    change("other", "started_other", "confirmed", "cancelled", "Não posso"),
    /já começou/,
  );
  await rejected(
    change("company", "started_other", "confirmed", "cancelled", "Já não"),
    /já começou/,
  );
  // The company can still record the absence.
  await change("company", "started_other", "confirmed", "no_show", "Não veio");
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
