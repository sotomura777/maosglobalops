import { useAuth } from '../App';
import { signOut } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <span style={{ fontWeight: 800 }}>MAOS<span style={{ color: 'var(--accent)' }}>GLOBAL</span>OPS</span>
        <button onClick={() => signOut().then(() => navigate('/', { replace: true }))}
          style={{ background: 'none', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', color: 'var(--text-2)', padding: '8px 14px', fontSize: 13 }}>Sair</button>
      </header>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Olá, {profile?.name || '—'} 👋</h1>
      <p style={{ color: 'var(--text-2)', marginTop: 8 }}>
        O teu perfil está criado. A seguir chegam: experiência e currículo, disponibilidade, trabalhos e rankings.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 22 }}>
        <button onClick={() => navigate('/app/perfil')} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, textAlign: 'left', color: 'var(--text)' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>O meu perfil →</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Skills, experiência, disponibilidade e visibilidade.</div>
        </button>
        <button onClick={() => navigate('/app/diretorio')} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, textAlign: 'left', color: 'var(--text)' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Diretório →</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Quem está na rede — por categoria e distrito.</div>
        </button>
      </div>
    </div>
  );
}
