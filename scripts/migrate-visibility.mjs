// Ensaio por defeito. Põe visibility: "public" nas ofertas publicadas antes das ofertas privadas.
// Tem de correr ANTES de publicar as regras novas: sem o campo, as ofertas não aparecem no Explorar.
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const args = process.argv.slice(2),
  projectId = args[args.indexOf("--project") + 1];
if (!["maosglobalops", "demo-globalops"].includes(projectId))
  throw new Error("Indica --project maosglobalops ou demo-globalops.");
const execute = args.includes("--execute"),
  db = getFirestore(initializeApp({ projectId }));
const jobs = await db.collection("jobs").get();
const missing = jobs.docs.filter((d) => typeof d.data().visibility !== "string");
if (execute)
  for (let i = 0; i < missing.length; i += 400) {
    const batch = db.batch();
    // Só acrescenta o campo; nunca altera condições nem estado.
    missing.slice(i, i + 400).forEach((d) => batch.update(d.ref, { visibility: "public" }));
    await batch.commit();
  }
// Ensaio sem --execute: só mostra as contagens.
console.log(
  JSON.stringify({ projectId, jobs: jobs.size, missingVisibility: missing.length, updated: execute ? missing.length : 0 }),
);
