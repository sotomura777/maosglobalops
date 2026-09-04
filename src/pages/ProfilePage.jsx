import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { updateProfile } from '../services/profileService';
import { listValidationsFor, listWorkEntries } from '../services/workService';
import { CATEGORIES, DISTRICTS, AVAILABILITY, PREFS } from '../constants';
import { S as UI, MONO, LightThread, Avatar, levelFromScore, scoreOf } from '../ui';

const S = {
  card: { ...UI.card, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 12 },
  lbl: UI.lbl,
  chip: UI.chip,
  btn: UI.btn,
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
  const [validations, setValidations] = useState([]);
  const [avgRate, setAvgRate] = useState(null);
  useEffect(() => { listValidationsFor(user.uid).then(setValidations).catch(() => {}); }, [user.uid]);
  useEffect(() => {
    // €/h médio vem do registo privado de horas — só o próprio o vê
    listWorkEntries(user.uid).then(entries => {
      const t = entries.reduce((a, e) => ({ h: a.h + e.hours, v: a.v + e.hours * e.rate }), { h: 0, v: 0 });
      setAvgRate(t.h > 0 ? t.v / t.h : null);
    }).catch(() => {});
  }, [user.uid]);

  const stats = useMemo(() => {
    const agg = validations.reduce((a, v) => ({ count: a.count + (Number(v.jobs) || 1), hours: a.hours + (Number(v.hours) || 0) }), { count: 0, hours: 0 });
    return { ...agg, level: levelFromScore(scoreOf(agg)).level };
  }, [validations]);

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
    <div style={{ minHeight: '100vh', maxWidth: 560, margin: '0 auto' }}>
      <header style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <Link to="/app" style={{ color: 'var(--text-2)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>← Início</Link>
        <button onClick={save} disabled={saving} style={{ ...S.btn, padding: '12px 18px', fontSize: 12, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'A guardar…' : saved ? 'Guardado ✓' : 'Guardar perfil'}
        </button>
      </header>

      {/* cabeçalho — gradiente radial, medalhão de nível, números das validações */}
      <div style={{ position: 'relative', padding: '24px 20px 20px', background: 'radial-gradient(120% 130% at 12% 0%, #1E2024 0%, #121315 48%, #0A0A0B 100%)' }}>
        <LightThread inset={20} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={profile?.name} size={62} level={validations.length > 0 ? stats.level : 0} ring="#0F1012" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "700 20px/1.15 'Public Sans', sans-serif", letterSpacing: '-.03em' }}>{profile?.name || '—'}</div>
            <div style={{ font: "400 12px/1.4 'Public Sans', sans-serif", color: 'var(--text-3)', marginTop: 5 }}>{p.headline || 'Sem apresentação ainda'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 20 }}>
          {[[stats.count, 'eventos'], [Math.round(stats.hours).toLocaleString('pt-PT'), 'horas'],
            [validations.length, 'validações'], [avgRate != null ? avgRate.toLocaleString('pt-PT', { maximumFractionDigits: 2 }) : '—', '€/h médio']].map(([n, l], i) => (
            <div key={l} style={{ flex: 1 }}>
              <div style={{ font: `400 18px/1 ${MONO}`, color: i === 3 && avgRate != null ? 'var(--green)' : 'var(--text)' }}>{n}</div>
              <div style={{ font: "400 10px/1 'Public Sans', sans-serif", color: 'var(--text-4)', marginTop: 7 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ font: "400 10px/1.4 'Public Sans', sans-serif", color: 'var(--text-5)', marginTop: 16 }}>Calculados das validações — não se editam.</div>
      </div>

      <div style={{ padding: 20 }}>
        <div style={S.card}>
          <span style={S.lbl}>Apresentação</span>
          <input value={p.headline} onChange={e => setP({ ...p, headline: e.target.value })}
            placeholder="Ex: Empregado de mesa e bar · 4 anos de eventos" />
          <textarea value={p.bio} onChange={e => setP({ ...p, bio: e.target.value })} rows={3}
            placeholder="Fala de ti em 2-3 frases — o que fazes melhor, o que procuras." style={{ resize: 'vertical' }} />
        </div>

        <div style={S.card}>
          <span style={S.lbl}>Categorias de trabalho</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {CATEGORIES.map(c => <button key={c} onClick={() => toggle('categories', c)} style={S.chip(p.categories.includes(c))}>{c}</button>)}
          </div>
        </div>

        <div style={S.card}>
          <span style={S.lbl}>Onde e quando</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            <select value={p.district} onChange={e => setP({ ...p, district: e.target.value })}
              style={{ color: p.district ? 'var(--text)' : 'var(--text-5)' }}>
              <option value="">Distrito…</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input value={p.languages} onChange={e => setP({ ...p, languages: e.target.value })} placeholder="Línguas (ex: PT, EN)" />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {AVAILABILITY.map(([k, lbl, color]) => (
              <button key={k} onClick={() => setP({ ...p, availability: k })}
                style={{ ...S.chip(p.availability === k), background: 'transparent', borderColor: p.availability === k ? color : 'rgba(255,255,255,.10)', color: p.availability === k ? color : 'var(--text-3)' }}>{lbl}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {PREFS.map(pr => <button key={pr} onClick={() => toggle('prefs', pr)} style={S.chip(p.prefs.includes(pr))}>{pr}</button>)}
          </div>
        </div>

        <div style={S.card}>
          <span style={S.lbl}>Experiência</span>
          {p.experience.map(x => (
            <div key={x.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "700 13px/1.3 'Public Sans', sans-serif" }}>{x.role} · <span style={{ font: "400 13px/1.3 'Public Sans', sans-serif", color: 'var(--text-2)' }}>{x.company}</span></div>
                <div style={{ font: "400 11px/1.4 'Public Sans', sans-serif", color: 'var(--text-3)', marginTop: 4 }}>{x.period}{x.note ? ` — ${x.note}` : ''}</div>
                <div style={{ font: `${x.validated ? 600 : 400} 10px/1 'Public Sans', sans-serif`, color: x.validated ? 'var(--green)' : 'var(--text-4)', marginTop: 6 }}>{x.validated ? '✓ Validado pela empresa' : 'Auto-declarado'}</div>
              </div>
              <button onClick={() => setP(prev => ({ ...prev, experience: prev.experience.filter(e => e.id !== x.id) }))}
                style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 15 }}>×</button>
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input value={exp.role} onChange={e => setExp({ ...exp, role: e.target.value })} placeholder="Função (ex: Barman)" />
            <input value={exp.company} onChange={e => setExp({ ...exp, company: e.target.value })} placeholder="Empresa / evento" />
            <input value={exp.period} onChange={e => setExp({ ...exp, period: e.target.value })} placeholder="Período (ex: 2024–2026)" />
            <input value={exp.note} onChange={e => setExp({ ...exp, note: e.target.value })} placeholder="Nota (opcional)" />
          </div>
          <button onClick={addExp} style={{ ...S.chip(true), alignSelf: 'flex-start', padding: '11px 14px' }}>+ Adicionar experiência</button>
        </div>

        {validations.length > 0 && (
          <div style={{ ...S.card, borderColor: 'rgba(52,211,153,.20)' }}>
            <span style={S.lbl}>Validações de empresas · {validations.length}</span>
            <div>
              {validations.map((v, i) => (
                <div key={v.id} style={{ padding: '10px 0', borderBottom: i < validations.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ font: "700 12px/1 'Public Sans', sans-serif", color: 'var(--green)' }}>✓</span>
                    <span style={{ font: "700 13px/1 'Public Sans', sans-serif" }}>{v.role}</span>
                    <span style={{ font: "400 13px/1 'Public Sans', sans-serif", color: 'var(--text-2)' }}>— validado por {v.companyName}</span>
                    {v.viaApp && <span style={{ font: "800 9px/1 'Public Sans', sans-serif", letterSpacing: '.08em', color: 'var(--gold)', border: '1px solid rgba(240,201,106,.4)', borderRadius: 99, padding: '4px 8px' }}>APP OFICIAL</span>}
                  </div>
                  {(v.period || v.hours) && <div style={{ font: `400 11px/1 ${MONO}`, color: 'var(--text-3)', marginTop: 6 }}>{[v.period, v.hours ? `${v.hours}h` : null].filter(Boolean).join(' · ')}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={S.card}>
          <span style={S.lbl}>Visibilidade e contacto</span>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={p.public} onChange={e => setP({ ...p, public: e.target.checked })} style={{ width: 17, height: 17, accentColor: 'var(--text)' }} />
            Perfil visível no diretório
          </label>
          <input value={p.phone} onChange={e => setP({ ...p, phone: e.target.value })} placeholder="Telefone (opcional — visível a quem te encontrar)" />
          <div style={{ display: 'flex', gap: 10, background: 'rgba(240,201,106,.08)', borderRadius: 12, padding: 13 }}>
            <span style={{ font: "400 12px/1.5 'Public Sans', sans-serif", color: 'var(--gold)', flex: 'none' }}>✦</span>
            <span style={{ font: "400 12px/1.55 'Public Sans', sans-serif", color: '#D9C89B' }}>
              Trabalhas com uma empresa que usa a app MaosOps? Usa aqui o <b style={{ color: 'var(--text)' }}>mesmo email</b> — os teus trabalhos validados sincronizam para o teu perfil e ranking.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
