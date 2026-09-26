/** Arquiva apenas as ofertas de demonstração identificadas na revisão de UX. */
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
const args = process.argv.slice(2),
  projectId = args[args.indexOf("--project") + 1];
if (!["maosglobalops", "demo-globalops"].includes(projectId))
  throw new Error("Indica --project maosglobalops ou demo-globalops.");
const db = getFirestore(initializeApp({ projectId }));
const execute = args.includes("--execute");
const jobs = await db
  .collection("jobs")
  .where("title", "==", "2 barmen — Festival Teste")
  .get();
let archived = 0;
const report = [];
for (const doc of jobs.docs) {
  const j = doc.data();
  if (j.companyName !== "Empresa Teste Lda") continue;
  const apps = await db
    .collection("engagements")
    .where("jobId", "==", doc.id)
    .get();
  const active = apps.docs.filter((d) =>
    ["accepted", "confirmed", "completion_requested"].includes(d.data().status),
  ).length;
  report.push({
    id: doc.id,
    title: j.title,
    company: j.companyName,
    status: j.status,
    date: j.date || null,
    engagements: apps.size,
    active,
  });
  if (execute && j.status === "open") {
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      if (fresh.data()?.status !== "open") return;
      tx.update(doc.ref, {
        status: "closed",
        archiveReason:
          "Oferta de demonstração arquivada após revisão do mercado",
        archivedAt: FieldValue.serverTimestamp(),
      });
    });
    archived++;
  }
}
console.log(
  JSON.stringify(
    { mode: execute ? "execute" : "dry-run", archived, offers: report },
    null,
    2,
  ),
);
