/**
 * F5 — Ponte hub-and-spoke: app de empresa → MaosGlobalOps.
 *
 * LÊ (apenas lê!) os trabalhos concluídos e horas VALIDADAS de uma app
 * MaosOps (maosops, btrustops, …) e escreve/atualiza na plataforma UMA
 * validação agregada por trabalhador, com o carimbo da empresa.
 *
 * Correspondência: EMAIL verificado do worker com autorização explícita na plataforma.
 * Sem correspondência → ignorado (o trabalhador ainda não aderiu à plataforma).
 *
 *   node scripts/sync-from-app.mjs --project maosglobalops --app maosops --company "Mãos"            # dry-run
 *   node scripts/sync-from-app.mjs --project maosglobalops --app maosops --company "Mãos" --execute
 *
 * Idempotente: doc id determinístico app-{app}-{workerDocId} com set(merge).
 * Credenciais: ADC (gcloud auth application-default login) com acesso aos 2 projetos.
 * Recomendado: --source-key <ficheiro.json> de uma conta de serviço só com "Cloud Datastore
 * Viewer" no projeto da app — assim é impossível escrever na app, mesmo com um bug aqui.
 * REGRA SAGRADA: este script NUNCA escreve na app de empresa — só na plataforma.
 */
import { readFileSync } from "node:fs";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { eligibleEmail, canAssociate } from "./lib/import-identity.mjs";

const args = process.argv.slice(2);
const appProject = args[args.indexOf("--app") + 1];
const companyName = args[args.indexOf("--company") + 1];
const hubProject = args[args.indexOf("--project") + 1];
const sourceKey = args.includes("--source-key")
  ? args[args.indexOf("--source-key") + 1]
  : null;
const EXECUTE = args.includes("--execute");
if (!appProject || !companyName || appProject.startsWith("--")) {
  console.error('uso: --project <maosglobalops|demo-globalops> --app <projectId> --company "Nome" [--execute]');
  process.exit(1);
}
if (!["maosglobalops", "demo-globalops"].includes(hubProject))
  throw new Error("Indica --project maosglobalops ou demo-globalops.");

const src = initializeApp(
  {
    credential: sourceKey
      ? cert(JSON.parse(readFileSync(sourceKey, "utf8")))
      : applicationDefault(),
    projectId: appProject,
  },
  "src",
);
const hub = initializeApp(
  { credential: applicationDefault(), projectId: hubProject },
  "hub",
);
const sdb = getFirestore(src);
const hdb = getFirestore(hub);

// 1. perfis da plataforma por email (só workers)
const profSnap = await hdb
  .collection("profiles")
  .where("kind", "==", "worker")
  .get();
const byEmail = new Map();
// Consent + verified Auth identity, never trust the editable/imported email alone.
const ambiguous = new Set();
for (const d of profSnap.docs) {
  if (d.data().importExperience !== true) continue;
  let account;
  try {
    account = await getAuth(hub).getUser(d.id);
  } catch (error) {
    if (error.code === "auth/user-not-found") continue;
    throw error;
  }
  const e = eligibleEmail(d.data(), account);
  if (!e) continue;
  if (byEmail.has(e)) ambiguous.add(e);
  else byEmail.set(e, d.id);
}
for (const email of ambiguous) byEmail.delete(email);
console.log(`plataforma: ${byEmail.size} trabalhadores`);

// 2. workers da app (email via users linked ou doc) + horas validadas por order
const [workersSnap, usersSnap, ordersSnap] = await Promise.all([
  sdb.collection("workers").get(),
  sdb.collection("users").where("role", "==", "worker").get(),
  sdb.collection("orders").where("status", "in", ["completed", "closed"]).get(),
]);
const emailByUid = new Map(
  usersSnap.docs.map((d) => [
    d.id,
    (d.data().email || "").trim().toLowerCase(),
  ]),
);
const workers = new Map(); // docId → { email, name }
workersSnap.docs.forEach((d) => {
  const w = d.data();
  const email = (
    w.email ||
    emailByUid.get(w.linkedUserId) ||
    emailByUid.get(d.id) ||
    ""
  )
    .trim()
    .toLowerCase();
  workers.set(d.id, { email, name: w.name || "—" });
});

const agg = new Map(); // workerDocId → { hours, jobs }
ordersSnap.docs.forEach((d) => {
  const o = d.data();
  Object.entries(o.workerHours || {}).forEach(([wId, wh]) => {
    if (!wh?.validated) return;
    const h = Number(wh.reported) || 0;
    const a = agg.get(wId) || { hours: 0, jobs: 0 };
    a.hours += h;
    a.jobs += 1;
    agg.set(wId, a);
  });
});
console.log(
  `${appProject}: ${ordersSnap.size} eventos concluídos, ${agg.size} workers com horas validadas`,
);

// 3. cruzar e escrever
let matched = 0,
  skipped = 0;
for (const [wId, a] of agg) {
  const w = workers.get(wId);
  const hubUid = w?.email ? byEmail.get(w.email) : null;
  if (!hubUid) {
    skipped++;
    continue;
  }
  // A source record must never silently move to a different GlobalOps account.
  const target = hdb.collection("validations").doc(`app-${appProject}-${wId}`);
  const existing = await target.get();
  if (existing.exists && existing.data().workerId !== hubUid) {
    skipped++;
    continue;
  }
  matched++;
  console.log(
    `  Correspondência elegível: ${a.jobs} trabalhos, ${Math.round(a.hours)}h`,
  );
  if (EXECUTE) {
    await hdb.runTransaction(async (tx) => {
      const current = await tx.get(target);
      const profile = await tx.get(hdb.collection("profiles").doc(hubUid));
      if (
        profile.data()?.importExperience !== true ||
        (current.exists && current.data().workerId !== hubUid)
      )
        return;
      const account = await getAuth(hub).getUser(hubUid);
      if (!canAssociate(profile.data(), account, w.email, current.data(), hubUid)) return;
      tx.set(
        target,
        {
          workerId: hubUid,
          workerName: w.name,
          companyId: `app-${appProject}`,
          companyName,
          role: "Staff de eventos",
          period: null,
          hours: Math.round(a.hours),
          jobs: a.jobs,
          source: appProject,
          viaApp: true,
          createdAt: current.data()?.createdAt || new Date().toISOString(),
          syncedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    });
  }
}
console.log(
  `\ncorrespondências: ${matched} · sem perfil na plataforma: ${skipped}`,
);
console.log(
  EXECUTE
    ? "SINCRONIZADO."
    : "Dry-run — nada foi escrito. Repetir com --execute.",
);
