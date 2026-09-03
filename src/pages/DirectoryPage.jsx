import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { listPublicProfiles } from '../services/profileService';
import { CATEGORIES, DISTRICTS, AVAILABILITY } from '../constants';

export default function DirectoryPage() {
  const [all, setAll] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [dist, setDist] = useState('');

  useEffect(() => { listPublicProfiles().then(setAll).catch(() => setAll([])); }, []);

  const results = useMemo(() => (all || []).filter(p =>
    (!q.trim() || (p.name || '').toLowerCase().includes(q.toLowerCase()) || (p.headline || '').toLowerCase().includes(q.toLowerCase())) &&
    (!cat || (p.categories || []).includes(cat)) &&
    (!dist || p.district === dist)
  ), [all, q, cat, dist]);

  const availOf = (k) => AVAILABILITY.find(a => a[0] === k) || AVAILABILITY[0];

  return (
    <div style={{ minHeight: '100vh', padding: 24, maxWidth: 860, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <Link to="/app" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>← Início</Link>
      </header>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 14 }}>Diretório</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Procurar por nome ou função…" />
        <select value={cat} onChange={e => setCat(e.target.value)} style={{ background: 'var(--card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '12px 14px', font: 'inherit' }}>
          <option value="">Categoria</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={dist} onChange={e => setDist(e.target.value)} style={{ background: 'var(--card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '12px 14px', font: 'inherit' }}>
          <option value="">Distrito</option>{DISTRICTS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>
      {all === null ? <p style={{ color: 'var(--text-3)' }}>A carregar…</p> :
        results.length === 0 ? <p style={{ color: 'var(--text-3)' }}>Sem resultados — ajusta os filtros.</p> :
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {results.map(p => {
            const [, aLbl, aClr] = availOf(p.availability);
            return (
              <div key={p.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', margin: '3px 0 8px' }}>{p.headline || '—'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {(p.categories || []).slice(0, 4).map(c => <span key={c} style={{ fontSize: 11, color: 'var(--accent)', border: '1px solid rgba(76,201,240,0.3)', borderRadius: 99, padding: '2px 8px' }}>{c}</span>)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{p.district || '—'}</span>
                  <span style={{ color: aClr }}>● {aLbl}</span>
                </div>
              </div>
            );
          })}
        </div>}
    </div>
  );
}
