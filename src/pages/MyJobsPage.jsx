import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { createJob, listMyJobs, listApplications } from '../services/jobsService';
import { listValidationsFor } from '../services/workService';
import { CATEGORIES, DISTRICTS } from '../constants';
import { S, MONO, Avatar, CompanyMark, levelFromScore, scoreOf } from '../ui';

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
    // o nível vem do perfil público do candidato (validações) — é o único dado externo
    const withLevels = await Promise.all(list.map(async (a) => {
      const vals = await listValidationsFor(a.id).catch(() => []);
      const agg = vals.reduce((x, v) => ({ count: x.count + (Number(v.jobs) || 1), hours: x.hours + (Number(v.hours) || 0) }), { count: 0, hours: 0 });
      return { ...a, level: vals.length > 0 ? levelFromScore(scoreOf(agg)).level : 0 };
    }));
    setApps(p => ({ ...p, [jobId]: withLevels }));
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: 720, margin: '0 auto' }}>
      <header style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/app" style={{ color: 'var(--text-2)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>← Início</Link>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(240,201,106,.10)', border: '1px solid rgba(240,201,106,.24)', borderRadius: 99, padding: '6px 12px 6px 8px' }}>
            <CompanyMark name={profile?.name} color={profile?.brandColor} size={20} radius={6} fontSize={8} />
            <span style={{ font: "600 11px/1 'Public Sans', sans-serif" }}>{profile?.name || '—'}</span>
            <span style={{ font: "400 10px/1 'Public Sans', sans-serif", color: 'var(--text-3)' }}>empresa</span>
          </span>
        </div>
        <button onClick={() => setComposing(v => !v)} style={{ ...S.btn, fontSize: 12, padding: '12px 20px' }}>+ Publicar trabalho</button>
      </header>

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ font: "800 24px/1 'Public Sans', sans-serif", letterSpacing: '-.035em' }}>Os meus trabalhos</h1>

        {composing && (
          <div style={{ ...S.card, border: '1px solid var(--border-mid)', display: 'flex', flexDirection: 'column', gap: 10, padding: 18 }}>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título — ex: 4 barmen para festival, sábado" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ color: form.category ? 'var(--text)' : 'var(--text-5)' }}>
                <option value="">Categoria…</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} style={{ color: form.district ? 'var(--text)' : 'var(--text-5)' }}>
                <option value="">Distrito…</option>{DISTRICTS.map(d => <option key={d}>{d}</option>)}
              </select>
              <input value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} placeholder="Data (ex: 14 Set)" />
              <input value={form.pay} onChange={e => setForm({ ...form, pay: e.target.value })} placeholder="Pagamento (ex: 9€/h)" />
            </div>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Detalhes — horário, farda, refeição…" style={{ resize: 'vertical' }} />
            <button onClick={publish} disabled={saving} style={{ ...S.btn, borderRadius: 12, padding: '14px 20px', alignSelf: 'flex-start', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'A publicar…' : 'Publicar'}
            </button>
          </div>
        )}

        {jobs === null ? <p style={{ color: 'var(--text-3)', fontSize: 13 }}>A carregar…</p> :
          jobs.length === 0 ? <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Ainda não publicaste trabalhos.</p> :
          jobs.map(j => (
            <div key={j.id} style={{ ...S.card, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: "700 15px/1.2 'Public Sans', sans-serif", letterSpacing: '-.015em' }}>{j.title}</div>
                  <div style={{ font: "400 12px/1.4 'Public Sans', sans-serif", color: 'var(--text-3)', marginTop: 5 }}>{j.district}{j.date ? ` · ${j.date}` : ''}{j.pay ? ` · ${j.pay}` : ''}</div>
                </div>
                <button onClick={() => toggleApps(j.id)} style={{ font: "500 12px/1 'Public Sans', sans-serif", color: 'var(--text-2)', background: 'none', border: '1px solid var(--border-mid)', borderRadius: 12, padding: '10px 15px', flex: 'none' }}>
                  Candidatos {apps[j.id] ? '▴' : '▾'}
                </button>
              </div>
              {apps[j.id] && (apps[j.id].length === 0
                ? <p style={{ fontSize: 12, color: 'var(--text-5)', borderTop: '1px solid var(--border)', paddingTop: 13, marginTop: 13 }}>Ainda sem candidaturas.</p>
                : apps[j.id].map(a => (
                  <div key={a.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 13, marginTop: 13, display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                    <Avatar name={a.name} size={34} level={a.level} ring="var(--card)" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ font: "700 14px/1.2 'Public Sans', sans-serif" }}>{a.name}</span>
                        {a.phone && <span style={{ font: `400 12px/1 ${MONO}`, color: 'var(--text-2)' }}>· {a.phone}</span>}
                      </div>
                      {a.message
                        ? <div style={{ font: "400 13px/1.5 'Public Sans', sans-serif", color: 'var(--text-3)', marginTop: 5 }}>{a.message}</div>
                        : <div style={{ font: "400 12px/1.5 'Public Sans', sans-serif", color: 'var(--text-5)', marginTop: 5 }}>Sem mensagem</div>}
                    </div>
                  </div>
                )))}
            </div>
          ))}

        <div style={{ background: 'var(--card)', border: '1px dashed var(--border-mid)', borderRadius: 16, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ font: "400 12px/1 'Public Sans', sans-serif", color: 'var(--text-4)', flex: 'none' }}>✦</span>
          <span style={{ font: "400 12px/1.55 'Public Sans', sans-serif", color: 'var(--text-3)' }}>
            O nível no avatar vem do perfil público do candidato. É o único dado da GlobalOps que aparece aqui — o resto é o que a pessoa enviou na candidatura: nome, telefone e mensagem.
          </span>
        </div>
      </div>
    </div>
  );
}
