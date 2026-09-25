import { test } from "node:test";
import assert from "node:assert/strict";
import {
  actionsFor,
  validateJob,
  estimatePay,
  matchesJob,
  isLateCancel,
  attendanceRate,
  platformEarnings,
  personalEarnings,
  summarizeEarnings,
} from "../src/marketplace/model.js";
test("worker and company must each confirm the agreed stages", () => {
  assert.deepEqual(
    actionsFor("pending", false).map((a) => a[0]),
    ["cancelled"],
  );
  assert.deepEqual(
    actionsFor("accepted", false).map((a) => a[0]),
    ["confirmed", "cancelled"],
  );
  assert.deepEqual(
    actionsFor("confirmed", true).map((a) => a[0]),
    ["completion_requested", "no_show", "cancelled"],
  );
  assert.deepEqual(actionsFor("no_show", true), []);
  assert.deepEqual(actionsFor("no_show", false), []);
  assert.deepEqual(
    actionsFor("completion_requested", false).map((a) => a[0]),
    ["completed", "confirmed"],
  );
  for (const status of ["completed", "cancelled", "rejected"]) {
    assert.deepEqual(actionsFor(status, true), []);
    assert.deepEqual(actionsFor(status, false), []);
  }
});
test("late cancellation only applies within 24h of a confirmed shift's start", () => {
  const start = Date.parse("2099-10-10T18:00:00Z");
  const confirmed = { status: "confirmed", agreedTerms: { startMs: start } };
  assert.equal(isLateCancel(confirmed, start - 25 * 3600000), false);
  assert.equal(isLateCancel(confirmed, start - 12 * 3600000), true);
  // Only confirmed engagements with a known start can be late.
  assert.equal(
    isLateCancel({ status: "accepted", agreedTerms: { startMs: start } }, start),
    false,
  );
  assert.equal(isLateCancel({ status: "confirmed" }, start), false);
});
test("attendance rate is completed over completed-plus-no-shows, or null when unknown", () => {
  assert.equal(attendanceRate({ completed: 8, noShows: 2 }), 80);
  assert.equal(attendanceRate({ completed: 5 }), 100);
  assert.equal(attendanceRate({}), null);
  assert.equal(attendanceRate({ noShows: 3 }), 0);
});
test("job rejects invalid numbers, dates and incomplete payment conditions", () => {
  const j = {
    title: "Mesa",
    category: "Mesa",
    district: "Lisboa",
    location: "Hotel",
    date: "2099-10-10",
    startTime: "18:00",
    endTime: "02:00",
    rate: 12,
    vacancies: 2,
    paymentTerms: "15 dias",
    description: "Serviço de mesa",
  };
  assert.equal(validateJob(j), "");
  for (const data of [
    { rate: Infinity },
    { rate: 0 },
    { vacancies: 1.5 },
    { vacancies: 0 },
    { date: "2000-01-01" },
    { paymentTerms: "" },
    { location: "" },
  ])
    assert.ok(validateJob({ ...j, ...data }));
});

test("estimated pay respects overnight shifts and fixed service rates", () => {
  assert.deepEqual(
    estimatePay({
      rate: 14,
      payType: "hour",
      startTime: "18:00",
      endTime: "23:00",
    }),
    { total: 70, hours: 5, estimated: true },
  );
  assert.equal(
    estimatePay({
      rate: 12,
      payType: "hour",
      startTime: "18:00",
      endTime: "02:00",
    }).total,
    96,
  );
  assert.equal(
    estimatePay({ rate: 12, startTime: "18:00", endTime: "18:00" }),
    null,
  );
  assert.deepEqual(estimatePay({ rate: 80, payType: "service" }), {
    total: 80,
    hours: null,
    estimated: false,
  });
});
test("payment type filters independently of minimum rate", () => {
  const job = { title: "Mesa", date: "2099-10-10", payType: "hour", rate: 14 };
  assert.equal(matchesJob(job, { payType: "service" }), false);
  assert.equal(matchesJob(job, { payType: "hour" }), true);
  assert.equal(matchesJob(job, { payType: "hour", rate: 15 }), false);
});

test("completed jobs become earnings from the agreed terms, per hour or per service", () => {
  const h = 3600000;
  const done = (id, terms, status = "completed") => ({
    id,
    status,
    title: "Mesa",
    companyName: "Aurora",
    jobId: "j-" + id,
    agreedTerms: { date: "2026-09-10", ...terms },
  });
  const entries = platformEarnings([
    done("hourly", { startMs: 0, endMs: 5 * h, rate: 12, payType: "hour" }),
    done("service", { startMs: 0, endMs: 4 * h, rate: 100, payType: "service" }),
    done("pending", { startMs: 0, endMs: 5 * h, rate: 12, payType: "hour" }, "confirmed"),
    { id: "legacy", status: "completed" },
  ]);
  assert.deepEqual(
    entries.map((e) => [e.id, e.hours, e.amount, e.source]),
    [
      ["hourly", 5, 60, "app"],
      ["service", 4, 100, "app"],
    ],
  );
});

test("the summary splits this month, totals, the hourly average and recent months", () => {
  const entries = [
    ...personalEarnings([{ id: "w1", date: "2026-09-02", hours: 4, rate: 10, company: "Café" }]),
    { id: "a", source: "app", date: "2026-09-10", hours: 5, amount: 60 },
    { id: "b", source: "app", date: "2026-08-20", hours: 4, amount: 100 },
  ];
  const s = summarizeEarnings(entries, "2026-09");
  assert.deepEqual(s.month, { hours: 9, amount: 100 });
  assert.deepEqual(s.total, { hours: 13, amount: 200 });
  assert.equal(Math.round(s.average * 100) / 100, 15.38);
  assert.equal(Math.round(s.averageApp * 100) / 100, 17.78);
  assert.deepEqual(s.byMonth.map((m) => [m.month, m.amount]), [
    ["2026-09", 100],
    ["2026-08", 100],
  ]);
  assert.deepEqual(summarizeEarnings([], "2026-09").average, 0);
});
