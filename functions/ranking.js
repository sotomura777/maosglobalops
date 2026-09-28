import { FieldValue, Timestamp } from "firebase-admin/firestore";
// Ranking da GlobalOps: só trabalho feito ou confirmado aqui, com empresas validadas.
// 20 pontos por trabalho e 1 por hora; cada falta tira 15% e cada cancelamento em
// cima da hora 5%. A avaliação média desempata. A fórmula está explicada na página.
export function rankingScore({ jobs, hours, noShows = 0, lateCancels = 0 }) {
  const factor = Math.max(0, 1 - 0.15 * noShows - 0.05 * lateCancels);
  return Math.round((20 * jobs + hours) * factor);
}

export function buildRanking({ workers, history, reputations, reviews, verifiedCompanies }) {
  const totals = new Map();
  for (const h of history) {
    // Trabalhos passados confirmados (external) só existem com empresa validada;
    // os feitos na app só contam se a empresa estiver validada agora.
    const counts = h.source === "external" || (h.source === "app" && verifiedCompanies.has(h.companyId));
    if (!counts) continue;
    const t = totals.get(h.workerId) || { jobs: 0, hours: 0 };
    t.jobs += 1;
    t.hours += Number(h.hours) || 0;
    totals.set(h.workerId, t);
  }
  const ratings = new Map();
  for (const r of reviews) {
    const x = ratings.get(r.subjectId) || { sum: 0, n: 0 };
    x.sum += Number(r.rating) || 0;
    x.n += 1;
    ratings.set(r.subjectId, x);
  }
  const entries = workers
    .filter((w) => w.kind === "worker" && w.public === true && totals.has(w.uid))
    .map((w) => {
      const t = totals.get(w.uid);
      const rep = reputations[w.uid] || {};
      const rating = ratings.get(w.uid);
      const hours = Math.round(t.hours * 10) / 10;
      return {
        uid: w.uid,
        name: w.name || "",
        headline: w.headline || "",
        district: w.district || "",
        jobs: t.jobs,
        hours,
        noShows: rep.noShows || 0,
        lateCancels: rep.cancellationsLate || 0,
        rating: rating ? Math.round((rating.sum / rating.n) * 10) / 10 : null,
        reviews: rating?.n || 0,
        score: rankingScore({
          jobs: t.jobs,
          hours,
          noShows: rep.noShows || 0,
          lateCancels: rep.cancellationsLate || 0,
        }),
      };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || (b.rating ?? 0) - (a.rating ?? 0) || b.jobs - a.jobs);
  return { entries };
}

// Recalcula e guarda: rankings/current (os 100 primeiros) e a posição de cada um na sua reputação.
export async function refreshRanking(db, now) {
  const [profiles, history, reps, reviews, verified] = await Promise.all([
    db.collection("publicProfiles").where("public", "==", true).get(),
    db.collection("workHistory").get(),
    db.collection("reputations").get(),
    db.collection("reviews").select("subjectId", "rating").get(),
    db.collection("companyStatus").where("verification", "==", "verified").get(),
  ]);
  const { entries } = buildRanking({
    workers: profiles.docs.map((d) => ({ uid: d.id, ...d.data() })),
    history: history.docs.map((d) => d.data()),
    reputations: Object.fromEntries(reps.docs.map((d) => [d.id, d.data()])),
    reviews: reviews.docs.map((d) => d.data()),
    verifiedCompanies: new Set(verified.docs.map((d) => d.id)),
  });
  await db.doc("rankings/current").set({
    entries: entries.slice(0, 100),
    total: entries.length,
    updatedAt: Timestamp.fromMillis(now),
  });
  const ranked = new Set(entries.map((e) => e.uid));
  const writes = [
    ...entries.map((e, i) => [e.uid, { rank: { position: i + 1, score: e.score, of: entries.length } }]),
    // Quem saiu do ranking (perfil privado, sem trabalho válido) deixa de ter posição.
    ...reps.docs.filter((d) => d.data().rank && !ranked.has(d.id)).map((d) => [d.id, { rank: FieldValue.delete() }]),
  ];
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    writes.slice(i, i + 400).forEach(([uid, data]) => batch.set(db.doc(`reputations/${uid}`), data, { merge: true }));
    await batch.commit();
  }
  return { total: entries.length };
}
