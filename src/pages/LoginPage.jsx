import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { signIn } from '../services/authService';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  useEffect(() => { if (user) navigate('/app', { replace: true }); }, [user, navigate]);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await signIn(form.email.trim(), form.password);
      // redireção reativa via useEffect quando o contexto receber o user
    } catch {
      setError('Email ou password errados.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Entrar</h1>
        {error && <div style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.35)', borderRadius: 'var(--radius)', color: 'var(--danger)', padding: '10px 14px', fontSize: 13 }}>{error}</div>}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-3)' }}>Email
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoComplete="email" /></label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-3)' }}>Password
          <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoComplete="current-password" /></label>
        <button type="submit" disabled={saving} style={{ background: 'var(--accent)', color: '#08222E', fontWeight: 700, border: 'none', borderRadius: 'var(--radius)', padding: '13px 18px', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'A entrar…' : 'Entrar'}
        </button>
        <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>Ainda sem perfil? <Link to="/registar" style={{ color: 'var(--accent)' }}>Criar perfil</Link></p>
      </form>
    </div>
  );
}
