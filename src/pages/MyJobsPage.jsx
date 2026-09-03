import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { createJob, listMyJobs, listApplications } from '../services/jobsService';
import { CATEGORIES, DISTRICTS } from '../constants';

export default function MyJobsPage() {
  const { user, profile } = useAuth();
  const [jobs, setJobs] = useState(null);
  const [form, setForm] = useState({ title: '', category: '', district: '', date: '', pay: '', description: '' });
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apps, setApps] = useState({}); // jobId → candidaturas

  const load = () => listMyJobs(user.uid).then(setJobs).catch(() => setJobs([]));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const publish = async () => {
    if (!form.title.trim() || !form.district) return alert('Título e distrito são obrigatórios.');
    setSaving(true);
    try {
      await createJob({ ...form, status: 'open', featured: false, companyId: user.uid, companyName: profile?.name || '—' });
      setForm({ title: '', category: '', district: '', date: '', pay: '', description: '' });
      setComposing(false);
      load();
    } catch { alert('Erro ao publicar.'); }
    finally { setSaving(false); }
  };

  const toggleApps = async (jobId) => {
    if (apps[jobId]) return setApps(p => ({ ...p, [jobId]: null }));
    const list = await listApplications(jobId).catch(() => []);
    setApps(p => ({ ...p, [jobId]: list }));
  };

  return (
    <div style={{ minHeight: '100vh', padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <Link to="/app" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>← Início</Link>
        <button onClick={() => setComposing(v => !v)} style={{ background: 'var(--accent)', color: '#08222E', fontWeight: 700, border: 'none', borderRadius: 'var(--radius)', padding: '10px 16px' }}>+ Publicar trabalho</button>
      </header>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 14 }}>Os meus trabalhos</h1>

      {composing && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16, display: 'grid', gap: 10 }}>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título — ex: 4 barmen para festival, sábado" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ background: 'var(--bg)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '12px 14px', font: 'inherit' }}>
              <option value="">Categoria…</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} style={{ background: 'var(--bg)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '12px 14px', font: 'inherit' }}>
              <option value="">Distrito…</option>{DISTRICTS.map(d => <option key={d}>{d}</option>)}
            </select>
            <input value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} placeholder="Data (ex: 14 Set)" />
            <input value={form.pay} onChange={e => setForm({ ...form, pay: e.target.value })} placeholder="Pagamento (ex: 9€/h)" />
          </div>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Detalhes — horário, farda, refeição…"
            style={{ background: 'var(--bg)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', color: 'var(--text)', font: 'inherit', padding: '12px 14px' }} />
          <button onClick={publish} disabled={saving} style={{ background: 'var(--accent)', color: '#08222E', fontWeight: 700, border: 'none', borderRadius: 'var(--radius)', padding: '12px 18px', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'A publicar…' : 'Publicar'}
          </button>
        </div>
      )}

      {jobs === null ? <p style={{ color: 'var(--text-3)' }}>A carregar…</p> :
        jobs.length === 0 ? <p style={{ color: 'var(--text-3)' }}>Ainda não publicaste trabalhos.</p> :
        jobs.map(j => (
          <div key={j.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{j.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{j.district}{j.date ? ` · ${j.date}` : ''}{j.pay ? ` · ${j.pay}` : ''}</div>
              </div>
              <button onClick={() => toggleApps(j.id)} style={{ background: 'none', border: '1px solid var(--border-mid)', color: 'var(--text-2)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 13, alignSelf: 'flex-start' }}>
                Candidatos {apps[j.id] ? '▴' : '▾'}
              </button>
            </div>
            {apps[j.id] && (apps[j.id].length === 0
              ? <p style={{ fontSize: 13, color: 'var(--text-4)', marginTop: 10 }}>Ainda sem candidaturas.</p>
              : apps[j.id].map(a => (
                <div key={a.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10, fontSize: 14 }}>
                  <b>{a.name}</b>{a.phone ? <span style={{ color: 'var(--text-2)' }}> · {a.phone}</span> : null}
                  {a.message && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{a.message}</div>}
                </div>
              )))}
          </div>
        ))}
    </div>
  );
}
