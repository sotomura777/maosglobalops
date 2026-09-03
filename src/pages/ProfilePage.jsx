import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { updateProfile } from '../services/profileService';
import { CATEGORIES, DISTRICTS, AVAILABILITY, PREFS } from '../constants';

const S = {
  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, marginBottom: 14 },
  lbl: { fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8, display: 'block' },
  chip: (a) => ({ padding: '8px 13px', borderRadius: 99, border: `1px solid ${a ? 'var(--accent)' : 'var(--border-mid)'}`, background: a ? 'rgba(76,201,240,0.12)' : 'transparent', color: a ? 'var(--accent)' : 'var(--text-3)', fontSize: 13, cursor: 'pointer' }),
  btn: { background: 'var(--accent)', color: '#08222E', fontWeight: 700, border: 'none', borderRadius: 'var(--radius)', padding: '12px 20px' },
};

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [p, setP] = useState(() => ({
    headline: '', district: '', categories: [], prefs: [], languages: '',
    availability: 'disponivel', public: true, phone: '', bio: '',
    experience: [], ...profile,
  }));
  const [exp, setExp] = useState({ company: '', role: '', period: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (k, v) => setP(prev => ({ ...prev, [k]: prev[k].includes(v) ? prev[k].filter(x => x !== v) : [...prev[k], v] }));

  const addExp = () => {
    if (!exp.company.trim() || !exp.role.trim()) return;
    setP(prev => ({ ...prev, experience: [...prev.experience, { ...exp, id: crypto.randomUUID(), validated: false }] }));
    setExp({ company: '', role: '', period: '', note: '' });
  };

  const save = async () => {
    setSaving(true); setSaved(false);
    const { id, kind, email, createdAt, gdprConsent, ...data } = p;
    try { await updateProfile(user.uid, data); setSaved(true); }
    catch { alert('Erro ao guardar — tenta novamente.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <Link to="/app" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>← Início</Link>
        <button onClick={save} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'A guardar…' : saved ? 'Guardado ✓' : 'Guardar perfil'}
        </button>
      </header>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>O meu perfil</h1>

      <div style={S.card}>
        <span style={S.lbl}>Apresentação</span>
        <input value={p.headline} onChange={e => setP({ ...p, headline: e.target.value })}
          placeholder="Ex: Empregado de mesa e bar · 4 anos de eventos" style={{ marginBottom: 10 }} />
        <textarea value={p.bio} onChange={e => setP({ ...p, bio: e.target.value })} rows={3}
          placeholder="Fala de ti em 2-3 frases — o que fazes melhor, o que procuras."
          style={{ width: '100%', background: 'var(--card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', color: 'var(--text)', font: 'inherit', padding: '12px 14px', resize: 'vertical' }} />
      </div>

      <div style={S.card}>
        <span style={S.lbl}>Categorias de trabalho</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map(c => <button key={c} onClick={() => toggle('categories', c)} style={S.chip(p.categories.includes(c))}>{c}</button>)}
        </div>
      </div>

      <div style={S.card}>
        <span style={S.lbl}>Onde e quando</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <select value={p.district} onChange={e => setP({ ...p, district: e.target.value })}
            style={{ background: 'var(--card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', color: p.district ? 'var(--text)' : 'var(--text-4)', padding: '12px 14px', font: 'inherit' }}>
            <option value="">Distrito…</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input value={p.languages} onChange={e => setP({ ...p, languages: e.target.value })} placeholder="Línguas (ex: PT, EN)" />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {AVAILABILITY.map(([k, lbl, color]) => (
            <button key={k} onClick={() => setP({ ...p, availability: k })}
              style={{ ...S.chip(p.availability === k), borderColor: p.availability === k ? color : 'var(--border-mid)', color: p.availability === k ? color : 'var(--text-3)', background: 'transparent' }}>{lbl}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PREFS.map(pr => <button key={pr} onClick={() => toggle('prefs', pr)} style={S.chip(p.prefs.includes(pr))}>{pr}</button>)}
        </div>
      </div>

      <div style={S.card}>
        <span style={S.lbl}>Experiência</span>
        {p.experience.map(x => (
          <div key={x.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{x.role} · <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>{x.company}</span></div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{x.period}{x.note ? ` — ${x.note}` : ''}</div>
              <span style={{ fontSize: 11, color: x.validated ? 'var(--green)' : 'var(--text-4)' }}>{x.validated ? '✓ Validado pela empresa' : 'Auto-declarado'}</span>
            </div>
            <button onClick={() => setP(prev => ({ ...prev, experience: prev.experience.filter(e => e.id !== x.id) }))}
              style={{ background: 'none', border: 'none', color: 'var(--text-4)' }}>×</button>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          <input value={exp.role} onChange={e => setExp({ ...exp, role: e.target.value })} placeholder="Função (ex: Barman)" />
          <input value={exp.company} onChange={e => setExp({ ...exp, company: e.target.value })} placeholder="Empresa / evento" />
          <input value={exp.period} onChange={e => setExp({ ...exp, period: e.target.value })} placeholder="Período (ex: 2024–2026)" />
          <input value={exp.note} onChange={e => setExp({ ...exp, note: e.target.value })} placeholder="Nota (opcional)" />
        </div>
        <button onClick={addExp} style={{ ...S.chip(true), marginTop: 10 }}>+ Adicionar experiência</button>
      </div>

      <div style={S.card}>
        <span style={S.lbl}>Visibilidade e contacto</span>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, cursor: 'pointer', marginBottom: 10 }}>
          <input type="checkbox" checked={p.public} onChange={e => setP({ ...p, public: e.target.checked })} style={{ width: 'auto' }} />
          Perfil visível no diretório
        </label>
        <input value={p.phone} onChange={e => setP({ ...p, phone: e.target.value })} placeholder="Telefone (opcional — visível a quem te encontrar)" />
      </div>
    </div>
  );
}
