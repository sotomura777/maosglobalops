import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { listAllValidations } from '../services/workService';
import { listPublicProfiles } from '../services/profileService';
import { scoreOf } from '../ui';

export default function RankingsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [me, setMe] = useState(null); // a minha linha, mesmo fora do top 50

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
        const all = Object.entries(agg)
          .map(([id, v]) => ({ id, ...pubIds.get(id), vCount: v.count, vHours: v.hours, score: scoreOf(v) }))
          .sort((a, b) => b.score - a.score);
        setRows(all.slice(0, 50));
        const myIdx = all.findIndex(r => r.id === user?.uid);
        setMe(myIdx >= 0 ? { ...all[myIdx], pos: myIdx + 1 } : null);
      } catch { setRows([]); }
    })();
  }, [user?.uid]);

  const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

  return (
    <div style={{ minHeight: '100vh', padding: 24, maxWidth: 680, margin: '0 auto' }}>
      <header style={{ marginBottom: 22 }}><Link to="/app" style={{ color: 'var(--text-2)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>← Início</Link></header>
      <h1 style={{ font: "800 24px/1 'Public Sans', sans-serif", letterSpacing: '-.035em' }}>Ranking nacional</h1>
      <p style={{ font: "400 13px/1.5 'Public Sans', sans-serif", color: 'var(--text-3)', margin: '8px 0 20px' }}>Só conta trabalho validado por empresas — não há atalhos.</p>
      {rows === null ? <p style={{ color: 'var(--text-3)', fontSize: 13 }}>A carregar…</p> :
        rows.length === 0 ? <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Ainda sem validações — o ranking nasce quando as empresas validarem os primeiros trabalhos.</p> :
        <>
          {rows.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: i < 3 ? 'var(--card)' : 'transparent', border: `1px solid ${i < 3 ? 'rgba(240,201,106,.28)' : 'var(--border)'}`, borderRadius: 14, padding: '13px 16px', marginBottom: 8 }}>
              <span style={{ font: `400 ${i < 3 ? 20 : 14}px/1 'Public Sans', sans-serif`, minWidth: 34, color: 'var(--text-3)', flex: 'none' }}>{medal(i)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "700 14px/1.2 'Public Sans', sans-serif" }}>{r.name}{r.id === user?.uid && <span style={{ font: "400 12px/1.2 'Public Sans', sans-serif", color: 'var(--text-3)' }}> — tu</span>}</div>
                <div style={{ font: "400 12px/1.3 'Public Sans', sans-serif", color: 'var(--text-3)', marginTop: 4 }}>{r.headline || r.district || '—'}</div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ font: "800 15px/1 'Public Sans', sans-serif", color: 'var(--gold)' }}>{r.score.toLocaleString('pt-PT')} pts</div>
                <div style={{ font: "400 11px/1 'Public Sans', sans-serif", color: 'var(--text-4)', marginTop: 5 }}>{r.vCount} trabalhos validados · {Math.round(r.vHours)}h</div>
              </div>
            </div>
          ))}
          {me && me.pos > 50 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 14, padding: '13px 16px', marginTop: 14 }}>
              <span style={{ font: "400 14px/1 'Public Sans', sans-serif", minWidth: 34, flex: 'none' }}>{me.pos}.</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "700 14px/1.2 'Public Sans', sans-serif" }}>{me.name} <span style={{ font: "400 12px/1.2 'Public Sans', sans-serif", color: 'var(--text-3)' }}>— tu</span></div>
                <div style={{ font: "400 12px/1.3 'Public Sans', sans-serif", color: 'var(--text-3)', marginTop: 4 }}>{me.headline || me.district || '—'}</div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ font: "800 15px/1 'Public Sans', sans-serif" }}>{me.score.toLocaleString('pt-PT')} pts</div>
                <div style={{ font: "400 11px/1 'Public Sans', sans-serif", color: 'var(--text-4)', marginTop: 5 }}>{me.vCount} trabalhos validados · {Math.round(me.vHours)}h</div>
              </div>
            </div>
          )}
          <p style={{ font: "400 11px/1.5 'Public Sans', sans-serif", color: 'var(--text-5)', marginTop: 16 }}>25 pontos por validação + 2 por hora. Só perfis públicos entram no ranking.</p>
        </>}
    </div>
  );
}
