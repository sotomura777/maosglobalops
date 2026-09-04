import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listAllValidations } from '../services/workService';
import { listPublicProfiles } from '../services/profileService';

// Score = só trabalho VALIDADO por empresas conta (25 pts/validação + 2 pts/hora)
const scoreOf = (v) => v.count * 25 + v.hours * 2;

export default function RankingsPage() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [vals, pubs] = await Promise.all([listAllValidations(), listPublicProfiles()]);
        const pubIds = new Map(pubs.map(p => [p.id, p]));
        const agg = {};
        vals.forEach(v => {
          if (!pubIds.has(v.workerId)) return; // só perfis públicos entram no ranking
          agg[v.workerId] = agg[v.workerId] || { count: 0, hours: 0 };
          agg[v.workerId].count += Number(v.jobs) || 1; // apps oficiais trazem nº de trabalhos
          agg[v.workerId].hours += Number(v.hours) || 0;
        });
        setRows(Object.entries(agg)
          .map(([id, v]) => ({ id, ...pubIds.get(id), vCount: v.count, vHours: v.hours, score: scoreOf(v) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 50));
      } catch { setRows([]); }
    })();
  }, []);

  const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

  return (
    <div style={{ minHeight: '100vh', padding: 24, maxWidth: 680, margin: '0 auto' }}>
      <header style={{ marginBottom: 22 }}><Link to="/app" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>← Início</Link></header>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Ranking nacional</h1>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 18 }}>Só conta trabalho validado por empresas — não há atalhos.</p>
      {rows === null ? <p style={{ color: 'var(--text-3)' }}>A carregar…</p> :
        rows.length === 0 ? <p style={{ color: 'var(--text-3)' }}>Ainda sem validações — o ranking nasce quando as empresas validarem os primeiros trabalhos.</p> :
        rows.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: i < 3 ? 'var(--card)' : 'transparent', border: `1px solid ${i < 3 ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 8 }}>
            <span style={{ fontSize: i < 3 ? 22 : 14, minWidth: 34, color: 'var(--text-3)' }}>{medal(i)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.headline || r.district || '—'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, color: 'var(--accent)' }}>{r.score} pts</div>
              <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{r.vCount} trabalhos validados · {Math.round(r.vHours)}h</div>
            </div>
          </div>
        ))}
    </div>
  );
}
