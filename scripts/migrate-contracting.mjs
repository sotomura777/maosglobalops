// Dry-run by default. No source-app access; only GlobalOps metadata is updated.
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { scheduleOf, overlaps } from "../functions/schedule.js";
const args = process.argv.slice(2),
  projectId = args[args.indexOf("--project") + 1];
if (!["maosglobalops", "demo-globalops"].includes(projectId))
  throw new Error("Indica --project maosglobalops ou demo-globalops.");
const execute = args.includes("--execute"),
  db = getFirestore(initializeApp({ projectId }));
const occupied = new Set(["confirmed", "completion_requested", "completed"]);
const [jobs, engagements] = await Promise.all([
  db.collection("jobs").get(),
  db.collection("engagements").get(),
]);
const schedules = new Map(),
  byWorker = new Map();
let invalidDates = 0,
  overCapacity = 0,
  conflicts = 0,
  missingJobs = 0,
  updated = 0;
for (const j of jobs.docs) {
  let s;
  try {
    s = scheduleOf(j.data());
  } catch {
    invalidDates++;
    continue;
  }
  schedules.set(j.id, s);
  const count = engagements.docs.filter(
    (a) => a.data().jobId === j.id && occupied.has(a.data().status),
  ).length;
  if (count > j.data().vacancies) overCapacity++;
}
for (const a of engagements.docs) {
  const data = a.data();
  if (!occupied.has(data.status)) continue;
  const s = data.agreedTerms || schedules.get(data.jobId);
  if (!s) {
    missingJobs++;
    continue;
  }
  const list = byWorker.get(data.workerId) || [];
  if (list.some((other) => overlaps(s, other))) conflicts++;
  list.push(s);
  byWorker.set(data.workerId, list);
}
// Conflicts need a human resolution, not an automatic cancellation or overwrite.
if (execute && (overCapacity || conflicts || missingJobs))
  throw new Error(
    "Existem conflitos históricos por resolver; nenhuma alteração foi feita. Executa sem --execute para consultar contagens.",
  );
if (execute)
  for (const j of jobs.docs) {
    if (!schedules.has(j.id)) continue;
    const changed = await db.runTransaction(async (tx) => {
      const current = await tx.get(j.ref);
      const applications = await tx.get(
        db.collection("engagements").where("jobId", "==", j.id),
      );
      const value = current.data(),
        s = scheduleOf(value);
      const filled = applications.docs.filter((a) =>
        occupied.has(a.data().status),
      ).length;
      if (filled > value.vacancies)
        throw new Error("A lotação mudou durante a migração.");
      if (
        value.filled === filled &&
        value.startAt?.toMillis() === s.startMs &&
        value.endAt?.toMillis() === s.endMs &&
        value.timeZone === s.timeZone
      )
        return false;
      tx.update(j.ref, {
        filled,
        startAt: Timestamp.fromMillis(s.startMs),
        endAt: Timestamp.fromMillis(s.endMs),
        timeZone: s.timeZone,
      });
      return true;
    });
    if (changed) updated++;
  }
console.log(
  JSON.stringify({
    projectId,
    execute,
    jobs: jobs.size,
    engagements: engagements.size,
    invalidDates,
    overCapacity,
    conflicts,
    missingJobs,
    updated,
  }),
);
