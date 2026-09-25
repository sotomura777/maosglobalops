import { Timestamp } from "firebase-admin/firestore";
// Médias de €/h publicadas no mercado, por função e distrito (e por função no país inteiro).
const ms = (v) => (typeof v === "number" ? v : v?.toMillis?.() ?? 0);

export function marketRates(jobs) {
  const acc = new Map();
  const add = (category, district, hourly) => {
    const key = `${category}\u0000${district}`;
    const a = acc.get(key) || { category, district, sum: 0, n: 0 };
    a.sum += hourly;
    a.n += 1;
    acc.set(key, a);
  };
  for (const j of jobs) {
    const rate = Number(j.rate);
    const hours = (ms(j.endAt) - ms(j.startAt)) / 3600000;
    const hourly = j.payType === "service" ? (hours > 0 ? rate / hours : NaN) : rate;
    // Valores partidos ou absurdos não entram na média.
    if (!(hourly > 0 && hourly < 500) || !j.category) continue;
    add(j.category, j.district || "", hourly);
    if (j.district) add(j.category, "", hourly);
  }
  return {
    rates: [...acc.values()].map(({ category, district, sum, n }) => ({
      category,
      district,
      avg: Math.round((sum / n) * 100) / 100,
      n,
    })),
  };
}

// Recalcula a partir das ofertas dos últimos 90 dias.
export async function refreshMarketStats(db, now) {
  const since = Timestamp.fromMillis(now - 90 * 86400000);
  const snap = await db.collection("jobs").where("startAt", ">=", since).get();
  const stats = marketRates(snap.docs.map((d) => d.data()));
  await db.doc("marketStats/current").set({
    ...stats,
    jobs: snap.size,
    updatedAt: Timestamp.fromMillis(now),
  });
  return stats;
}
