// Peças visuais partilhadas do redesenho — o desenho vive aqui, os dados nas páginas.

export const MONO = "'DM Mono', monospace";
export const GOLD_GRAD = 'linear-gradient(180deg, #F0C96A, #C89A2E)';

export const S = {
  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 17 },
  // gradiente radial de profundidade — só nos cartões-herói (perfil, nível, hero da landing)
  hero: { position: 'relative', overflow: 'hidden', border: '1px solid var(--border)', background: 'radial-gradient(120% 130% at 12% 0%, #1E2024 0%, #121315 48%, #0A0A0B 100%)' },
  lbl: { font: "600 10px/1 'Public Sans', sans-serif", letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-4)' },
  btn: { background: 'var(--text)', color: '#0A0A0B', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 99, padding: '13px 20px' },
  btnGhost: { background: 'rgba(255,255,255,.06)', color: 'var(--text-2)', fontWeight: 600, fontSize: 13, border: 'none', borderRadius: 99, padding: '13px 20px' },
  chip: (on) => ({
    font: `${on ? 600 : 500} 12px/1 'Public Sans', sans-serif`, borderRadius: 99, padding: '9px 13px', cursor: 'pointer',
    background: on ? 'rgba(255,255,255,.10)' : 'transparent',
    border: `1px solid ${on ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.10)'}`,
    color: on ? 'var(--text)' : 'var(--text-3)',
  }),
};

// fio de luz — linha de 1px no topo dos cartões-herói, desvanece nas pontas
export const LightThread = ({ inset = 20 }) => (
  <span aria-hidden="true" style={{ position: 'absolute', top: 0, left: inset, right: inset, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent)' }} />
);

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => (w[0] || '').toUpperCase()).join('') || '—';

// cor de empresa → fundo tingido e texto legível sobre tinta (derivados em runtime)
const rgb = (hex) => { const n = parseInt(hex.replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
export const tint = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };
export const brandText = (hex) => { const [r, g, b] = rgb(hex).map(c => Math.round(c + (255 - c) * 0.55)); return `rgb(${r},${g},${b})`; };

// quadrado com as iniciais da empresa, tingido com a cor dela (neutro sem cor)
export const CompanyMark = ({ name, color, size = 34, radius = 11, fontSize = 11 }) => (
  <div style={{
    width: size, height: size, borderRadius: radius, flex: 'none', textAlign: 'center',
    font: `700 ${fontSize}px/${size}px 'Public Sans', sans-serif`,
    background: color ? tint(color, .16) : 'rgba(255,255,255,.07)',
    color: color ? brandText(color) : 'var(--text-3)',
  }}>{initials(name)}</div>
);

// avatar redondo com medalhão de nível dourado (o nível é conquistado — só aparece com validações)
export const Avatar = ({ name, size = 32, level = 0, ring = 'var(--card)' }) => (
  <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
    <div style={{ width: size, height: size, borderRadius: 99, background: 'rgba(255,255,255,.08)', font: `700 ${Math.round(size * .32)}px/${size}px 'Public Sans', sans-serif`, textAlign: 'center', color: 'var(--text-2)' }}>{initials(name)}</div>
    {level > 0 && (
      <div style={{ position: 'absolute', bottom: -3, right: -3, minWidth: Math.round(size * .37), height: Math.round(size * .37), borderRadius: 99, background: GOLD_GRAD, color: '#0A0A0B', font: `800 ${Math.round(size * .18)}px/${Math.round(size * .37)}px 'Public Sans', sans-serif`, textAlign: 'center', border: `2px solid ${ring}`, padding: '0 2px' }}>{level}</div>
    )}
  </div>
);

// nível derivado da pontuação de validações (25 pts/validação + 2 pts/hora) — só visual
export const levelFromScore = (score) => {
  const level = Math.max(1, 1 + Math.floor(score / 200));
  const base = (level - 1) * 200;
  return {
    level, xp: score,
    missing: level * 200 - score,
    progress: Math.max(0, Math.min(1, (score - base) / 200)),
    league: level >= 7 ? 'Liga Ouro' : level >= 4 ? 'Liga Prata' : 'Liga Bronze',
  };
};

export const scoreOf = (v) => v.count * 25 + v.hours * 2;
