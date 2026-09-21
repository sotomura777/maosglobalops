/**
 * Migração idempotente das candidaturas antigas da GlobalOps.
 * Não lê nem escreve projetos MaosOps. Por omissão só apresenta contagens.
 * node scripts/migrate-marketplace.mjs --project maosglobalops
 * node scripts/migrate-marketplace.mjs --project maosglobalops --execute
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
const args = process.argv.slice(2);
const flag = args.indexOf("--project");
const projectId = flag >= 0 ? args[flag + 1] : null;
if (
  !projectId ||
  projectId.startsWith("--") ||
  !["maosglobalops", "demo-globalops"].includes(projectId)
) {
  throw new Error(
    "Indica --project maosglobalops (ou demo-globalops para testes).",
  );
}
const execute = args.includes("--execute");
const db = getFirestore(initializeApp({ projectId }));
const jobs = await db.collection("jobs").get();
let pending = 0,
  existing = 0,
  skipped = 0;
for (const job of jobs.docs) {
  const j = job.data();
  if (!j.companyId) continue;
  const applications = await job.ref.collection("applications").get();
  for (const application of applications.docs) {
    const ref = db.collection("engagements").doc(`${job.id}_${application.id}`);
    if ((await ref.get()).exists) {
      existing++;
      continue;
    }
    const worker = await db.collection("profiles").doc(application.id).get();
    if (!worker.exists || worker.data().kind !== "worker") {
      skipped++;
      continue;
    }
    const a = application.data();
    const parsed = Date.parse(a.createdAt);
    const createdAt = Number.isFinite(parsed)
      ? Timestamp.fromMillis(parsed)
      : Timestamp.now();
    pending++;
    if (execute) {
      try {
        await ref.create({
          jobId: job.id,
          companyId: j.companyId,
          workerId: application.id,
          workerName: a.name || worker.data().name || "Profissional",
          companyName: j.companyName || "Empresa",
          title: j.title || "Trabalho",
          message: a.message || "",
          status: "pending",
          actorId: application.id,
          note: "",
          createdAt,
          updatedAt: createdAt,
          source: "legacy",
        });
      } catch (error) {
        if (error.code !== 6) throw error;
        existing++;
        pending--;
      }
    }
  }
}
console.log(
  JSON.stringify(
    {
      projectId,
      mode: execute ? "execute" : "dry-run",
      [execute ? "created" : "toCreate"]: pending,
      existing,
      skipped,
    },
    null,
    2,
  ),
);
