import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { listPublicProfiles } from '../services/profileService';
import { createValidation } from '../services/workService';
import { useAuth } from '../App';
import { CATEGORIES, DISTRICTS, AVAILABILITY } from '../constants';

export default function DirectoryPage() {
  const { user, profile } = useAuth();
  const [validating, setValidating] = useState(null); // worker em validação
  const [vForm, setVForm] = useState({ role: '', period: '', hours: '' });
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
                  {(p.categories || []).slice(0, 4).map(c => <span key={c} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', background: 'rgba(255,255,255,.06)', borderRadius: 99, padding: '4px 10px' }}>{c}</span>)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{p.district || '—'}</span>
                  <span style={{ color: aClr }}>● {aLbl}</span>
                </div>
                {profile?.kind === 'company' && p.kind === 'worker' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {p.phone && <a href={`tel:${p.phone}`} style={{ flex: 1, textAlign: 'center', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', color: 'var(--text-2)', padding: '7px 0', fontSize: 12, textDecoration: 'none' }}>Ligar</a>}
                    <button onClick={() => { setValidating(p); setVForm({ role: '', period: '', hours: '' }); }}
                      style={{ flex: 1, background: 'transparent', border: '1px solid var(--green)', color: 'var(--green)', borderRadius: 'var(--radius)', padding: '7px 0', fontSize: 12, fontWeight: 700 }}>✓ Validar trabalho</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>}

      {validating && (
        <div onClick={e => e.target === e.currentTarget && setValidating(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', padding: 20, width: '100%', maxWidth: 420 }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Validar trabalho — {validating.name}</div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 12px' }}>A validação fica pública no perfil e conta para o ranking. Só valida trabalho que aconteceu mesmo.</p>
            <div style={{ display: 'grid', gap: 8 }}>
              <input autoFocus value={vForm.role} onChange={e => setVForm({ ...vForm, role: e.target.value })} placeholder="Função (ex: Barman)" />
              <input value={vForm.period} onChange={e => setVForm({ ...vForm, period: e.target.value })} placeholder="Quando (ex: Verão 2026)" />
              <input value={vForm.hours} onChange={e => setVForm({ ...vForm, hours: e.target.value })} placeholder="Horas totais (ex: 40)" inputMode="numeric" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => setValidating(null)} style={{ background: 'none', border: '1px solid var(--border-mid)', color: 'var(--text-2)', borderRadius: 'var(--radius)', padding: '10px 16px' }}>Cancelar</button>
              <button onClick={async () => {
                if (!vForm.role.trim()) return alert('Indica a função.');
                try {
                  await createValidation({ workerId: validating.id, workerName: validating.name, companyId: user.uid, companyName: profile?.name || '—', role: vForm.role.trim(), period: vForm.period.trim() || null, hours: Number(vForm.hours) || 0 });
                  setValidating(null);
                } catch { alert('Erro ao validar.'); }
              }} style={{ background: 'var(--green)', color: '#04120A', fontWeight: 700, border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px' }}>Confirmar validação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
