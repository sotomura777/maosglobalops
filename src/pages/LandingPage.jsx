import { Link } from 'react-router-dom';
import { S, MONO, LightThread, CompanyMark, GOLD_GRAD } from '../ui';

const goldText = { background: GOLD_GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' };

const STEPS = [
  ['01', 'Trabalhas', 'Candidatas-te no mercado aberto ou recebes escala da empresa onde já trabalhas.'],
  ['02', 'A empresa valida', 'Função, período e horas. Sem validação não conta — é o que dá valor ao resto.'],
  ['03', 'Sobes no ranking', '25 pontos por validação e 2 por hora. Só perfis públicos entram.'],
];

const COMPANIES = [
  ['MAOS', '#E11D48', 'Eventos e restauração · Porto', 'App dedicada'],
  ['Btrust', '#EC4899', 'Staff para eventos', 'App dedicada'],
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ font: "800 17px/1 'Public Sans', sans-serif", letterSpacing: '0.04em' }}>MAOS<span style={{ color: 'var(--gold)' }}>GLOBAL</span>OPS</span>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/entrar" style={{ color: 'var(--text-2)', textDecoration: 'none', fontSize: 13, fontWeight: 500, padding: '12px 16px' }}>Entrar</Link>
          <Link to="/registar" style={{ ...S.btn, textDecoration: 'none' }}>Criar perfil</Link>
        </nav>
      </header>

      {/* hero centrado com gradiente radial e fio de luz */}
      <main style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(60px, 10vw, 92px) 24px clamp(52px, 8vw, 76px)', background: 'radial-gradient(70% 110% at 50% -10%, #1C1E22 0%, #0F1012 48%, #0A0A0B 100%)' }}>
        <LightThread inset={44} />
        <div style={{ maxWidth: 660, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 99, padding: '8px 14px', marginBottom: 30 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--green)' }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>Aberto a staff e empresas — grátis</span>
          </div>
          <h1 style={{ font: "800 clamp(32px, 7vw, 54px)/1.1 'Public Sans', sans-serif", letterSpacing: '-.028em', textWrap: 'pretty' }}>
            O teu trabalho em eventos, <span style={goldText}>validado</span>.
          </h1>
          <p style={{ font: "400 17px/1.6 'Public Sans', sans-serif", color: 'var(--text-3)', margin: '20px auto 30px', maxWidth: 500 }}>
            Perfil profissional, experiência confirmada pelas empresas, disponibilidade num só sítio — e trabalhos a chegar até ti.
          </p>
          <Link to="/registar" style={{ ...S.btn, display: 'inline-block', textDecoration: 'none', fontSize: 15, padding: '18px 30px' }}>
            Criar o meu perfil — grátis
          </Link>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 20 }}>
            És uma empresa? <Link to="/registar-empresa" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Regista-te e encontra staff →</Link>
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-5)', marginTop: 22 }}>Plataforma em construção — pela equipa da MAOS.</p>
        </div>
      </main>

      {/* como funciona */}
      <section style={{ padding: 'clamp(44px, 6vw, 62px) 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ font: "800 clamp(24px, 4vw, 32px)/1.14 'Public Sans', sans-serif", letterSpacing: '-.036em', maxWidth: 540, textWrap: 'pretty' }}>
            O currículo que ninguém pode inflacionar.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 32 }}>
            {STEPS.map(([n, title, body]) => (
              <div key={n} style={{ ...S.card, borderRadius: 20, padding: 26 }}>
                <div style={{ font: `400 13px/1 ${MONO}`, color: 'var(--text-4)' }}>{n}</div>
                <div style={{ font: "700 19px/1.25 'Public Sans', sans-serif", letterSpacing: '-.025em', marginTop: 16 }}>{title}</div>
                <div style={{ font: "400 13px/1.6 'Public Sans', sans-serif", color: 'var(--text-3)', marginTop: 10 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* para empresas */}
      <section style={{ padding: 'clamp(40px, 6vw, 56px) 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px' }}>
            <div style={{ ...S.lbl, fontSize: 11, letterSpacing: '.16em' }}>Para empresas</div>
            <h2 style={{ font: "800 clamp(24px, 4vw, 30px)/1.15 'Public Sans', sans-serif", letterSpacing: '-.036em', marginTop: 16, textWrap: 'pretty' }}>
              Publica trabalhos. Ou traz a operação toda.
            </h2>
            <p style={{ font: "400 14px/1.65 'Public Sans', sans-serif", color: 'var(--text-3)', marginTop: 14, maxWidth: 450 }}>
              Adere e publica trabalhos para profissionais com historial verificado. Se precisares de mais, a tua empresa pode ter a sua própria app de gestão dentro da GlobalOps.
            </p>
            <Link to="/registar-empresa" style={{ ...S.btn, display: 'inline-block', textDecoration: 'none', padding: '16px 26px', marginTop: 26 }}>Registar empresa</Link>
          </div>
          <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {COMPANIES.map(([name, color, sub, badge]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '17px 20px' }}>
                <CompanyMark name={name} color={color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>{sub}</div>
                </div>
                <span style={{ font: "600 10px/1 'Public Sans', sans-serif", color: 'var(--gold)', background: 'rgba(240,201,106,.12)', borderRadius: 99, padding: '6px 10px', flex: 'none' }}>{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ marginTop: 'auto', padding: '32px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ font: "800 14px/1 'Public Sans', sans-serif", letterSpacing: '.04em', color: 'var(--text-3)' }}>MAOS<span style={{ color: 'var(--text-4)' }}>GLOBAL</span>OPS</span>
        <span style={{ fontSize: 12, color: 'var(--text-5)' }}>© 2026 · Plataforma em construção</span>
      </footer>
    </div>
  );
}
