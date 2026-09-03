import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontWeight: 800, letterSpacing: '0.04em', fontSize: 17 }}>MAOS<span style={{ color: 'var(--accent)' }}>GLOBAL</span>OPS</span>
        <nav style={{ display: 'flex', gap: 10 }}>
          <Link to="/entrar" style={{ color: 'var(--text-2)', textDecoration: 'none', padding: '10px 14px' }}>Entrar</Link>
          <Link to="/registar" style={{ background: 'var(--accent)', color: '#08222E', fontWeight: 700, textDecoration: 'none', padding: '10px 16px', borderRadius: 'var(--radius)' }}>Criar perfil</Link>
        </nav>
      </header>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 640, textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(30px, 6vw, 52px)', lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.02em' }}>
            O teu trabalho em eventos, <span style={{ color: 'var(--accent)' }}>validado</span>.
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 17, margin: '18px auto 28px', maxWidth: 480 }}>
            Perfil profissional, experiência confirmada pelas empresas, disponibilidade num só sítio — e trabalhos a chegar até ti.
          </p>
          <Link to="/registar" style={{ display: 'inline-block', background: 'var(--accent)', color: '#08222E', fontWeight: 700, textDecoration: 'none', padding: '14px 26px', borderRadius: 'var(--radius)', fontSize: 16 }}>
            Criar o meu perfil — grátis
          </Link>
          <p style={{ color: 'var(--text-4)', fontSize: 12, marginTop: 26 }}>Plataforma em construção — pela equipa da MAOS.</p>
        </div>
      </main>
    </div>
  );
}
