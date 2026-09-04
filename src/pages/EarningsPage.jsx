import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { addWorkEntry, deleteWorkEntry, listWorkEntries } from '../services/workService';

const eur = (v) => `${(Math.round(v * 100) / 100).toLocaleString('pt-PT')} €`;

export default function EarningsPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState(null);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), hours: '', rate: '', company: '' });
  const [saving, setSaving] = useState(false);

  const load = () => listWorkEntries(user.uid).then(setEntries).catch(() => setEntries([]));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    const hours = Number(String(form.hours).replace(',', '.'));
    const rate = Number(String(form.rate).replace(',', '.'));
    if (!form.date || !(hours > 0) || !(rate >= 0)) return alert('Data, horas e valor/hora são obrigatórios.');
    setSaving(true);
    try {
      await addWorkEntry(user.uid, { date: form.date, hours, rate, company: form.company.trim() || null });
      setForm(f => ({ ...f, hours: '', rate: '', company: '' }));
      load();
    } catch { alert('Erro ao guardar.'); }
    finally { setSaving(false); }
  };

  const stats = useMemo(() => {
    const all = entries || [];
    const now = new Date();
    const mPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const yPrefix = String(now.getFullYear());
    const sum = (list) => list.reduce((a, e) => ({ h: a.h + e.hours, v: a.v + e.hours * e.rate }), { h: 0, v: 0 });
    const total = sum(all), month = sum(all.filter(e => (e.date || '').startsWith(mPrefix))), year = sum(all.filter(e => (e.date || '').startsWith(yPrefix)));
    return { total, month, year, avg: total.h > 0 ? total.v / total.h : 0 };
  }, [entries]);

  return (
    <div style={{ minHeight: '100vh', padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <header style={{ marginBottom: 22 }}><Link to="/app" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>← Início</Link></header>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Horas e ganhos</h1>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>Registo pessoal e privado — só tu vês estes valores.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {[['Este mês', stats.month], ['Este ano', stats.year], ['Total', stats.total]].map(([lbl, s]) => (
          <div key={lbl} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{lbl}</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--green)' }}>{eur(s.v)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{Math.round(s.h * 10) / 10}h</div>
          </div>
        ))}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-4)' }}>Média €/h</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--gold)' }}>{eur(stats.avg)}</div>
        </div>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 90px 90px 1fr auto', gap: 8 }}>
        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        <input value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} placeholder="Horas" inputMode="decimal" />
        <input value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} placeholder="€/h" inputMode="decimal" />
        <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Empresa (opcional)" />
        <button onClick={add} disabled={saving} style={{ background: 'var(--text)', color: '#0A0A0B', fontWeight: 700, border: 'none', borderRadius: 'var(--radius-sm)', padding: '0 16px', opacity: saving ? 0.6 : 1 }}>+</button>
      </div>

      {entries === null ? <p style={{ color: 'var(--text-3)' }}>A carregar…</p> :
        entries.length === 0 ? <p style={{ color: 'var(--text-3)' }}>Regista o teu primeiro dia de trabalho acima.</p> :
        entries.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
            <span style={{ color: 'var(--text-3)', minWidth: 86 }}>{e.date}</span>
            <span style={{ fontWeight: 700 }}>{e.hours}h × {eur(e.rate)}</span>
            <span style={{ color: 'var(--green)', fontWeight: 700 }}>= {eur(e.hours * e.rate)}</span>
            <span style={{ color: 'var(--text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.company || ''}</span>
            <button onClick={() => deleteWorkEntry(user.uid, e.id).then(load)} style={{ background: 'none', border: 'none', color: 'var(--text-4)' }}>×</button>
          </div>
        ))}
    </div>
  );
}
