import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUpWorker } from '../services/authService';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim()) return setError('Preenche todos os campos.');
    if (form.password.length < 8) return setError('A password precisa de pelo menos 8 caracteres.');
    if (!consent) return setError('É preciso aceitares o tratamento de dados (RGPD).');
    setSaving(true);
    try {
      await signUpWorker(form.email.trim(), form.password, form.name.trim());
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err?.code === 'auth/email-already-in-use' ? 'Já existe uma conta com este email.' : 'Não foi possível criar a conta. Tenta novamente.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Criar perfil de trabalhador</h1>
        {error && <div style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.35)', borderRadius: 'var(--radius)', color: 'var(--danger)', padding: '10px 14px', fontSize: 13 }}>{error}</div>}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-3)' }}>Nome
          <input value={form.name} onChange={set('name')} autoComplete="name" /></label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-3)' }}>Email
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-3)' }}>Password (mín. 8)
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" /></label>
        <label style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ width: 'auto', marginTop: 2 }} />
          <span>Aceito o tratamento dos meus dados para criar e gerir o meu perfil profissional (RGPD).</span>
        </label>
        <button type="submit" disabled={saving} style={{ background: 'var(--accent)', color: '#08222E', fontWeight: 700, border: 'none', borderRadius: 'var(--radius)', padding: '13px 18px', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'A criar…' : 'Criar perfil'}
        </button>
        <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>Já tens conta? <Link to="/entrar" style={{ color: 'var(--accent)' }}>Entrar</Link></p>
      </form>
    </div>
  );
}
