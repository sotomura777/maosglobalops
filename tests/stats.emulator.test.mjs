import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { refreshMarketStats } from "../functions/stats.js";
const requireFunctions = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp, deleteApp } = requireFunctions("firebase-admin/app");
const { getFirestore, Timestamp } = requireFunctions("firebase-admin/firestore");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
const app = initializeApp({ projectId: "demo-globalops" }, "stats-tests");
const db = getFirestore(app);
const now = Date.parse("2095-06-01T00:00:00Z");
before(async () => {
  await fetch(
    "http://127.0.0.1:8080/emulator/v1/projects/demo-globalops/databases/(default)/documents",
    { method: "DELETE" },
  );
  const job = (id, daysAgo, rate) =>
    db.doc(`jobs/${id}`).set({
      category: "Bar",
      district: "Lisboa",
      rate,
      payType: "hour",
      startAt: Timestamp.fromMillis(now - daysAgo * 86400000),
      endAt: Timestamp.fromMillis(now - daysAgo * 86400000 + 5 * 3600000),
    });
  await job("recent-1", 10, 12);
  await job("recent-2", 80, 14);
  await job("too-old", 120, 40);
});
after(async () => {
  await db.terminate();
  await deleteApp(app);
});

test("the nightly job averages only the last 90 days of offers", async () => {
  await refreshMarketStats(db, now);
  const stats = (await db.doc("marketStats/current").get()).data();
  assert.equal(stats.jobs, 2);
  assert.deepEqual(
    stats.rates.find((r) => r.district === "Lisboa"),
    { category: "Bar", district: "Lisboa", avg: 13, n: 2 },
  );
});
