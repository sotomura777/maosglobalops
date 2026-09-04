/**
 * F5 — Ponte hub-and-spoke: app de empresa → MaosGlobalOps.
 *
 * LÊ (apenas lê!) os trabalhos concluídos e horas VALIDADAS de uma app
 * MaosOps (maosops, btrustops, …) e escreve/atualiza na plataforma UMA
 * validação agregada por trabalhador, com o carimbo da empresa.
 *
 * Correspondência: EMAIL do worker na app == email do perfil na plataforma.
 * Sem correspondência → ignorado (o trabalhador ainda não aderiu à plataforma).
 *
 *   node scripts/sync-from-app.mjs --app maosops --company "Mãos"            # dry-run
 *   node scripts/sync-from-app.mjs --app maosops --company "Mãos" --execute
 *
 * Idempotente: doc id determinístico app-{app}-{workerDocId} com set(merge).
 * Credenciais: ADC (gcloud auth application-default login) com acesso aos 2 projetos.
 * REGRA SAGRADA: este script NUNCA escreve na app de empresa — só na plataforma.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const appProject = args[args.indexOf('--app') + 1];
const companyName = args[args.indexOf('--company') + 1];
const EXECUTE = args.includes('--execute');
if (!appProject || !companyName || appProject.startsWith('--')) {
  console.error('uso: --app <projectId> --company "Nome" [--execute]'); process.exit(1);
}

const src = initializeApp({ credential: applicationDefault(), projectId: appProject }, 'src');
const hub = initializeApp({ credential: applicationDefault(), projectId: 'maosglobalops' }, 'hub');
const sdb = getFirestore(src);
const hdb = getFirestore(hub);

// 1. perfis da plataforma por email (só workers)
const profSnap = await hdb.collection('profiles').where('kind', '==', 'worker').get();
const byEmail = new Map();
profSnap.docs.forEach(d => { const e = (d.data().email || '').toLowerCase(); if (e) byEmail.set(e, d.id); });
console.log(`plataforma: ${byEmail.size} trabalhadores`);

// 2. workers da app (email via users linked ou doc) + horas validadas por order
const [workersSnap, usersSnap, ordersSnap] = await Promise.all([
  sdb.collection('workers').get(),
  sdb.collection('users').where('role', '==', 'worker').get(),
  sdb.collection('orders').where('status', 'in', ['completed', 'closed']).get(),
]);
const emailByUid = new Map(usersSnap.docs.map(d => [d.id, (d.data().email || '').toLowerCase()]));
const workers = new Map(); // docId → { email, name }
workersSnap.docs.forEach(d => {
  const w = d.data();
  const email = (w.email || emailByUid.get(w.linkedUserId) || emailByUid.get(d.id) || '').toLowerCase();
  workers.set(d.id, { email, name: w.name || '—' });
});

const agg = new Map(); // workerDocId → { hours, jobs }
ordersSnap.docs.forEach(d => {
  const o = d.data();
  Object.entries(o.workerHours || {}).forEach(([wId, wh]) => {
    if (!wh?.validated) return;
    const h = Number(wh.reported) || 0;
    const a = agg.get(wId) || { hours: 0, jobs: 0 };
    a.hours += h; a.jobs += 1;
    agg.set(wId, a);
  });
});
console.log(`${appProject}: ${ordersSnap.size} eventos concluídos, ${agg.size} workers com horas validadas`);

// 3. cruzar e escrever
let matched = 0, skipped = 0;
for (const [wId, a] of agg) {
  const w = workers.get(wId);
  const hubUid = w?.email ? byEmail.get(w.email) : null;
  if (!hubUid) { skipped++; continue; }
  matched++;
  console.log(`  ✓ ${w.name} (${w.email}) → ${a.jobs} trabalhos, ${Math.round(a.hours)}h`);
  if (EXECUTE) {
    await hdb.collection('validations').doc(`app-${appProject}-${wId}`).set({
      workerId: hubUid, workerName: w.name,
      companyId: `app-${appProject}`, companyName,
      role: 'Staff de eventos', period: null,
      hours: Math.round(a.hours), jobs: a.jobs,
      source: appProject, viaApp: true,
      createdAt: new Date().toISOString(), syncedAt: new Date().toISOString(),
    }, { merge: true });
  }
}
console.log(`\ncorrespondências: ${matched} · sem perfil na plataforma: ${skipped}`);
console.log(EXECUTE ? 'SINCRONIZADO.' : 'Dry-run — nada foi escrito. Repetir com --execute.');
