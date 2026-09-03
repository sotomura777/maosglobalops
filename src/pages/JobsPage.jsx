import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { listOpenJobs, applyToJob } from '../services/jobsService';

export default function JobsPage() {
  const { user, profile } = useAuth();
  const [jobs, setJobs] = useState(null);
  const [applying, setApplying] = useState(null); // job em candidatura
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(new Set());

  useEffect(() => { listOpenJobs().then(setJobs).catch(() => setJobs([])); }, []);

  const apply = async () => {
    try {
      await applyToJob(applying.id, user.uid, { name: profile?.name || '—', message: msg.trim() || null, phone: profile?.phone || null });
      setDone(prev => new Set([...prev, applying.id]));
      setApplying(null); setMsg('');
    } catch { alert('Erro ao candidatar — tenta novamente.'); }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <header style={{ marginBottom: 22 }}><Link to="/app" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>← Início</Link></header>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 14 }}>Trabalhos</h1>
      {jobs === null ? <p style={{ color: 'var(--text-3)' }}>A carregar…</p> :
        jobs.length === 0 ? <p style={{ color: 'var(--text-3)' }}>Ainda sem trabalhos publicados — em breve.</p> :
        jobs.map(j => (
          <div key={j.id} style={{ background: 'var(--card)', border: `1px solid ${j.featured ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: 16, marginBottom: 12, position: 'relative' }}>
            {j.featured && <span style={{ position: 'absolute', top: -9, right: 12, background: 'var(--accent)', color: '#08222E', fontSize: 10, fontWeight: 800, borderRadius: 99, padding: '2px 10px' }}>DESTACADO</span>}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{j.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{j.companyName} · {j.district}{j.date ? ` · ${j.date}` : ''}</div>
              </div>
              {j.pay && <div style={{ color: 'var(--green)', fontWeight: 700 }}>{j.pay}</div>}
            </div>
            {j.description && <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '8px 0 0' }}>{j.description}</p>}
            {profile?.kind === 'worker' && (
              done.has(j.id)
                ? <span style={{ display: 'inline-block', marginTop: 10, color: 'var(--green)', fontSize: 13 }}>✓ Candidatura enviada</span>
                : <button onClick={() => setApplying(j)} style={{ marginTop: 10, background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, fontWeight: 700 }}>Candidatar-me</button>
            )}
          </div>
        ))}

      {applying && (
        <div onClick={e => e.target === e.currentTarget && setApplying(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', padding: 20, width: '100%', maxWidth: 420 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Candidatura — {applying.title}</div>
            <textarea autoFocus value={msg} onChange={e => setMsg(e.target.value)} rows={3} placeholder="Mensagem para a empresa (opcional)"
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', color: 'var(--text)', font: 'inherit', padding: '12px 14px', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setApplying(null)} style={{ background: 'none', border: '1px solid var(--border-mid)', color: 'var(--text-2)', borderRadius: 'var(--radius)', padding: '10px 16px' }}>Cancelar</button>
              <button onClick={apply} style={{ background: 'var(--accent)', color: '#08222E', fontWeight: 700, border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px' }}>Enviar candidatura</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
