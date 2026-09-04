import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { listOpenJobs, applyToJob } from '../services/jobsService';
import { S, MONO, CompanyMark, GOLD_GRAD } from '../ui';

export default function JobsPage() {
  const { user, profile } = useAuth();
  const [jobs, setJobs] = useState(null);
  const [applying, setApplying] = useState(null); // job em candidatura
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(new Set());
  const [filter, setFilter] = useState('');

  useEffect(() => { listOpenJobs().then(setJobs).catch(() => setJobs([])); }, []);

  // chips de filtro derivados dos trabalhos carregados (categoria + distrito)
  const chips = useMemo(() => {
    const cats = [...new Set((jobs || []).map(j => j.category).filter(Boolean))];
    const dists = [...new Set((jobs || []).map(j => j.district).filter(Boolean))];
    return [...cats, ...dists].slice(0, 5);
  }, [jobs]);

  const visible = (jobs || []).filter(j => !filter || j.category === filter || j.district === filter);

  const apply = async () => {
    try {
      await applyToJob(applying.id, user.uid, { name: profile?.name || '—', message: msg.trim() || null, phone: profile?.phone || null });
      setDone(prev => new Set([...prev, applying.id]));
      setApplying(null); setMsg('');
    } catch { alert('Erro ao candidatar — tenta novamente.'); }
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ padding: '17px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/app" style={{ color: 'var(--text-2)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>←</Link>
          <span style={{ font: "700 19px/1 'Public Sans', sans-serif", letterSpacing: '-.03em' }}>Trabalhos</span>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 99, padding: '7px 12px' }}>
          <span style={{ font: "500 11px/1 'Public Sans', sans-serif", color: 'var(--text-2)' }}>Mercado aberto</span>
        </span>
      </div>

      {chips.length > 0 && (
        <div style={{ padding: '0 20px 14px', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('')}
            style={{ font: `${!filter ? 600 : 500} 11px/1 'Public Sans', sans-serif`, color: !filter ? '#0A0A0B' : 'var(--text-2)', background: !filter ? 'var(--text)' : 'rgba(255,255,255,.06)', border: 'none', borderRadius: 99, padding: '9px 13px' }}>
            Todos · {(jobs || []).length}
          </button>
          {chips.map(c => (
            <button key={c} onClick={() => setFilter(filter === c ? '' : c)}
              style={{ font: `${filter === c ? 600 : 500} 11px/1 'Public Sans', sans-serif`, color: filter === c ? '#0A0A0B' : 'var(--text-2)', background: filter === c ? 'var(--text)' : 'rgba(255,255,255,.06)', border: 'none', borderRadius: 99, padding: '9px 13px' }}>{c}</button>
          ))}
        </div>
      )}

      <div style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {jobs === null ? <p style={{ color: 'var(--text-3)', fontSize: 13 }}>A carregar…</p> :
          visible.length === 0 ? <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Ainda sem trabalhos publicados — em breve.</p> :
          visible.map(j => (
            <div key={j.id} style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: 'var(--card)', border: `1px solid ${j.featured ? 'rgba(240,201,106,.32)' : 'var(--border)'}`, padding: 17 }}>
              {j.featured && (
                <span style={{ position: 'absolute', top: 13, right: 16, font: "700 9px/1 'Public Sans', sans-serif", letterSpacing: '.12em', textTransform: 'uppercase', color: '#0A0A0B', background: GOLD_GRAD, borderRadius: 99, padding: '5px 9px' }}>Destacado</span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                <CompanyMark name={j.companyName} color={j.brandColor} size={24} radius={8} fontSize={9} />
                <span style={{ font: "500 11px/1 'Public Sans', sans-serif", color: 'var(--text-3)' }}>{j.companyName}</span>
              </div>
              <div style={{ font: "700 17px/1.2 'Public Sans', sans-serif", letterSpacing: '-.024em' }}>{j.title}</div>
              <div style={{ font: "400 12px/1.4 'Public Sans', sans-serif", color: 'var(--text-3)', marginTop: 6 }}>{j.district}{j.date ? ` · ${j.date}` : ''}</div>
              {j.description && <p style={{ font: "400 12px/1.5 'Public Sans', sans-serif", color: 'var(--text-3)', margin: '8px 0 0' }}>{j.description}</p>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 15, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  {j.pay && <span style={{ font: `400 19px/1 ${MONO}` }}>{j.pay}</span>}
                </span>
                {profile?.kind === 'worker' && (
                  done.has(j.id)
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 7, font: "500 12px/1 'Public Sans', sans-serif", color: 'var(--green)' }}><b>✓</b> Candidatura enviada</span>
                    : <button onClick={() => setApplying(j)} style={{ ...S.btn, fontSize: 12, padding: '12px 18px' }}>Candidatar</button>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* folha inferior de candidatura */}
      {applying && (
        <div onClick={e => e.target === e.currentTarget && setApplying(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(5,6,7,.72)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', background: 'var(--card-2)', borderTop: '1px solid rgba(255,255,255,.09)', borderRadius: '26px 26px 0 0', padding: '10px 22px 26px', display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ width: 38, height: 4, borderRadius: 99, background: 'rgba(255,255,255,.16)', margin: '0 auto' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CompanyMark name={applying.companyName} color={applying.brandColor} size={28} radius={9} fontSize={10} />
              <span style={{ font: "500 12px/1 'Public Sans', sans-serif", color: 'var(--text-3)' }}>{applying.companyName}{applying.district ? ` · ${applying.district}` : ''}</span>
            </div>
            <div style={{ font: "700 22px/1.2 'Public Sans', sans-serif", letterSpacing: '-.03em' }}>{applying.title}</div>
            <div style={{ display: 'flex', gap: 9 }}>
              {[['Data', applying.date || '—'], ['Categoria', applying.category || '—'], ['Pagamento', applying.pay || '—']].map(([l, v], i) => (
                <div key={l} style={{ flex: 1, background: 'var(--inset)', borderRadius: 13, padding: '13px 14px', minWidth: 0 }}>
                  <div style={{ font: "400 10px/1 'Public Sans', sans-serif", color: 'var(--text-4)' }}>{l}</div>
                  <div style={{ font: i === 1 ? "600 13px/1.2 'Public Sans', sans-serif" : `400 13px/1.2 ${MONO}`, color: i === 2 ? 'var(--green)' : 'var(--text)', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <span style={{ font: "500 11px/1 'Public Sans', sans-serif", color: 'var(--text-3)' }}>Mensagem para a empresa</span>
              <textarea autoFocus value={msg} onChange={e => setMsg(e.target.value)} rows={3}
                placeholder="Opcional — ex: já trabalhei em galas para 300 pessoas."
                style={{ borderRadius: 14, minHeight: 64, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setApplying(null)} style={{ ...S.btnGhost, padding: '16px 22px' }}>Cancelar</button>
              <button onClick={apply} style={{ ...S.btn, flex: 1, padding: 16 }}>Enviar candidatura</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
