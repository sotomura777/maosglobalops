import { test } from "node:test";
import assert from "node:assert/strict";
import { scheduleOf, overlaps } from "../functions/schedule.js";
test("Portugal and Azores calendars use explicit time zones in summer and winter", () => {
  for (const [date, district, utc] of [
    ["2027-01-10", "Lisboa", "2027-01-10T18:00:00.000Z"],
    ["2027-07-10", "Porto", "2027-07-10T17:00:00.000Z"],
    ["2027-01-10", "Açores", "2027-01-10T19:00:00.000Z"],
    ["2027-07-10", "Açores", "2027-07-10T18:00:00.000Z"],
  ]) {
    const s = scheduleOf({
      date,
      district,
      startTime: "18:00",
      endTime: "02:00",
    });
    assert.equal(new Date(s.startMs).toISOString(), utc);
    assert.equal(s.endMs - s.startMs, 8 * 3600000);
  }
});
test("invalid dates and ambiguous/nonexistent DST times fail explicitly", () => {
  for (const item of [
    { date: "2027-02-30", startTime: "18:00", endTime: "23:00" },
    { date: "2027-03-28", startTime: "01:30", endTime: "03:00" },
    { date: "2027-10-31", startTime: "01:30", endTime: "03:00" },
    { date: "2027-01-01", startTime: "18:00", endTime: "18:00" },
  ])
    assert.throws(() => scheduleOf(item));
});
test("adjacent shifts do not overlap but overnight intervals do", () => {
  const base = scheduleOf({
    date: "2027-01-10",
    startTime: "18:00",
    endTime: "02:00",
  });
  assert.equal(
    overlaps(
      base,
      scheduleOf({ date: "2027-01-11", startTime: "01:59", endTime: "03:00" }),
    ),
    true,
  );
  assert.equal(
    overlaps(
      base,
      scheduleOf({ date: "2027-01-11", startTime: "02:00", endTime: "03:00" }),
    ),
    false,
  );
});
