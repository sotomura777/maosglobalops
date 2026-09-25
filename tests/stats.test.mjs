import { test } from "node:test";
import assert from "node:assert/strict";
import { marketRates } from "../functions/stats.js";
const h = 3600000;
const job = (category, district, rate, payType = "hour", hours = 5) => ({
  category,
  district,
  rate,
  payType,
  startAt: 0,
  endAt: hours * h,
});

test("market rates average €/h by role and district, and by role overall", () => {
  const { rates } = marketRates([
    job("Bar", "Lisboa", 12),
    job("Bar", "Lisboa", 14),
    job("Bar", "Porto", 10),
    // A fixed fee over 4 hours counts as 25 €/h.
    job("Mesa", "Lisboa", 100, "service", 4),
    // Broken or absurd values never enter the average.
    job("Bar", "Lisboa", 0),
    job("Bar", "Lisboa", 50, "service", 0),
    job("Bar", "Lisboa", 9000),
  ]);
  const find = (category, district) =>
    rates.find((r) => r.category === category && r.district === district);
  assert.deepEqual(find("Bar", "Lisboa"), { category: "Bar", district: "Lisboa", avg: 13, n: 2 });
  assert.deepEqual(find("Bar", ""), { category: "Bar", district: "", avg: 12, n: 3 });
  assert.deepEqual(find("Mesa", "Lisboa"), { category: "Mesa", district: "Lisboa", avg: 25, n: 1 });
});
