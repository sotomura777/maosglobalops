// GlobalOpsLogo.jsx — logo MaosGlobalOps em vetor. Cores por tema (dark | light | bordeaux) ou por props.
// variant: 'symbol' (6) | 'horizontal' (1b → 7b/8b/9b) | 'oneline' (2b → 7c/8c/9c) | 'small' (topbar 7e/8e) | 'globe' (MAOS + globo, base do hero 7d/8d/9d)
import { useId } from 'react';

const LET = "M8.8 5L35 4.84L36.85 6L39.5 9L40.59 11L43.31 14L43.62 15L46.45 18L47.53 20L50.77 24L52 24.9L56.34 20L56.63 19L59.39 16L60.5 14L62.5 12L66 7.13L68 5.5L70 4.72L94 4.74L95 4.9L96.5 6L96.5 94L96 94.5L69 94.76L68 94.55L66.62 93L66.5 56L66 55.5L56.5 68L54.51 70L54.21 71L53 72.26L52 72.52L51 72.5L49.61 71L38.5 56L38 55.5L37.5 56L36.87 93L36 94.54L10 94.74L8 94.5L7.5 94L7.5 6ZM135.36 6L136 5.5L166 5.5L167.5 7L172.5 23L173.2 24L173.6 27L175.17 30L175.72 33L178.46 40L178.68 42L179.45 43L179.7 45L180.5 46L180.8 48L181.46 49L181.61 51L182.5 52L182.5 53L183.48 55L183.58 57L184.5 58L184.5 59L185.25 60L185.61 63L186.5 64L187.67 69L188.5 70L188.75 72L189.5 73L189.77 75L190.48 76L190.8 78L192.47 82L192.5 84L193.35 85L193.5 94L193 94.5L168 94.5L166.5 93L166.5 91L165.5 89L165.5 88L164.72 87L164.39 84L162 83.36L139 83.5L137.85 85L137.48 88L136.61 89L136.46 91L135 94.5L110 94.54L108 94.5L106.87 94L106.63 93L107.5 92L107.57 90L108.2 89L108.5 87L111.5 79L111.68 77L112.5 76L112.5 75L113.48 73L113.53 71L114.5 70L114.5 69L115.5 67L115.5 65L116.4 64L117.5 59L118.19 58L118.5 56L119.23 55L119.5 53L122.5 45L122.5 43L123.44 42L124.5 39L124.54 37L126.5 33L126.6 31L127.54 28L128.5 27L128.6 25L132.5 14L132.77 12L133.5 11L134.5 7ZM427.63 6L434 5.54L447 5.64L451 6.46L455 6.56L463 8.5L468 10.76L472 13.53L477.25 19L480.48 25L480.56 27L481.41 28L481.5 29L481.61 34L481 35.45L459 35.48L457.67 34L457.47 32L453 27.57L445 24.61L438 24.11L429 24.5L426 25.43L423 25.57L420 26.7L418.34 28L416.5 30L415.77 32L416.5 34L418.33 36L420 37.46L423 38.34L439 38.5L440 37.84L444 38.5L450 38.55L454 39.37L460 39.58L465 40.53L468 41.57L469 42.46L470 42.5L473 44.39L474 44.5L477 46.6L480.4 50L483.43 55L483.56 57L484.44 59L484.5 70L483.5 75L482.55 76L482.2 78L480.5 81L477.43 85L474 88.11L469 91.38L465 92.54L464 93.31L456 94.5L422 94.5L415 93.47L413 92.54L411 92.34L410 91.52L409 91.5L403 88.47L399 85.15L394.51 80L392.4 75L391.5 74L391.5 65L393 64.39L414 64.49L415.5 66L415.5 67L416.5 69L420 72.43L424 74.31L429 75.5L447 75.29L452 74.42L457.47 71L458.5 69L459.06 66L458.43 63L456 60.5L454 59.5L453 59.5L451 58.54L444 57.86L420 58.5L412 57.46L406 55.48L402 53.44L396.85 49L393.5 44L392.43 40L391.58 39L391.5 30L392.5 28L393.5 24L395.52 20L403 12.5L408 9.51L412 8.34L413 7.61L415 7.5L418 6.56ZM150.61 37L151 36.61L151.39 37L151.5 38L152.31 39L153.5 45L154.5 47L154.51 49L155.34 51L155.5 53L156.39 54L156.71 57L157.5 59L157.55 61L157 61.5L145 61.5L144.5 61L144.5 60L145.31 59L145.77 55L147.5 51L147.7 48L149.46 43L149.5 41L150.5 39Z";
const OW = "M240.5 5H339.5A45.5 45.5 0 0 1 339.5 96H240.5A45.5 45.5 0 0 1 240.5 5ZM242 34H338A16 16 0 0 1 338 66H242A16 16 0 0 1 242 34Z";
const FRONT = "M394 50 A104 54 0 0 1 186 50";
const TOP = [318.1, -7.1];

export const GOP_THEMES = {
  dark:     { letters: '#EEF1F2', o: '#F0C96A', accent: '#F0C96A', dot: '#EEF1F2', bg: '#0A0A0B', text: '#EEF1F2', ops: '#F0C96A', divider: 'rgba(255,255,255,.18)', grid: 'rgba(240,201,106,.14)', smallAccent: '#0A0A0B' },
  light:    { letters: '#67001D', o: '#67001D', accent: '#67001D', dot: '#E9C46A', bg: '#FFFFFF', text: '#171310', ops: '#67001D', divider: '#E0D8CA', grid: 'rgba(103,0,29,.10)', smallAccent: '#FFFFFF' },
  bordeaux: { letters: '#FFFFFF', o: '#FFFFFF', accent: '#E9C46A', dot: '#FFFFFF', bg: '#67001D', text: '#FFFFFF', ops: '#E9C46A', divider: 'rgba(255,255,255,.3)', grid: 'rgba(233,196,106,.22)', smallAccent: '#67001D' },
};

function Globe({ c, letters, uid }) {
  return (
    <>
      <defs>
        <clipPath id={uid + 'h'}><rect x="226" y="34" width="128" height="32" rx="16" /></clipPath>
        <clipPath id={uid + 'f'}><rect x="197" y="-40" width="186" height="190" /></clipPath>
      </defs>
      <ellipse cx="290" cy="50" rx="104" ry="54" transform="rotate(-12 290 50)" fill="none" stroke={c.accent} strokeWidth="3" />
      {letters && <path fillRule="evenodd" fill={c.letters} d={LET} />}
      <path fillRule="evenodd" fill={c.o} stroke={c.bg} strokeWidth="7" paintOrder="stroke" d={OW} />
      <g clipPath={`url(#${uid}h)`} fill="none" stroke={c.accent} strokeWidth="1.8">
        <ellipse cx="290" cy="50" rx="14" ry="17" /><ellipse cx="290" cy="50" rx="34" ry="17" /><ellipse cx="290" cy="50" rx="56" ry="17" /><line x1="220" y1="50" x2="360" y2="50" />
      </g>
      <g clipPath={`url(#${uid}f)`}><g transform="rotate(-12 290 50)"><path d={FRONT} fill="none" stroke={c.bg} strokeWidth="9" /><path d={FRONT} fill="none" stroke={c.accent} strokeWidth="3" /></g></g>
      <circle cx={TOP[0]} cy={TOP[1]} r="6" fill={c.dot} stroke={c.bg} strokeWidth="3" paintOrder="stroke" />
    </>
  );
}

function MiniO({ c, height, uid }) {
  return (
    <svg viewBox="195 5 190 91" height={height} style={{ display: 'block', width: 'auto' }} aria-hidden="true">
      <defs><clipPath id={uid}><rect x="226" y="34" width="128" height="32" rx="16" /></clipPath></defs>
      <path fillRule="evenodd" fill={c.o} d={OW} />
      <g clipPath={`url(#${uid})`} fill="none" stroke={c.smallAccent} strokeWidth="3"><ellipse cx="290" cy="50" rx="18" ry="18" /><ellipse cx="290" cy="50" rx="42" ry="18" /><line x1="220" y1="50" x2="360" y2="50" /></g>
    </svg>
  );
}

export default function GlobalOpsLogo({ variant = 'horizontal', theme = 'dark', colors, height = 32, title = 'MaosGlobalOps', style, ...rest }) {
  const c = { ...GOP_THEMES[theme], ...colors };
  const uid = 'gop' + useId().replace(/:/g, '');
  const aria = { role: 'img', 'aria-label': title };

  if (variant === 'symbol') return (
    <svg viewBox="180 -18 222 132" height={height} style={{ width: 'auto', overflow: 'visible', ...style }} {...aria} {...rest}><title>{title}</title><Globe c={c} uid={uid} /></svg>
  );
  if (variant === 'globe') return (
    <svg viewBox="0 -18 492 132" height={height} style={{ width: 'auto', overflow: 'visible', ...style }} {...aria} {...rest}><title>{title}</title><Globe c={c} letters uid={uid} /></svg>
  );
  if (variant === 'small') return (
    <svg viewBox="0 0 492 102" height={height} style={{ width: 'auto', ...style }} {...aria} {...rest}>
      <title>{title}</title>
      <defs><clipPath id={uid}><rect x="226" y="34" width="128" height="32" rx="16" /></clipPath></defs>
      <path fillRule="evenodd" fill={c.letters} d={LET} /><path fillRule="evenodd" fill={c.o} d={OW} />
      <g clipPath={`url(#${uid})`} fill="none" stroke={c.smallAccent} strokeWidth="4"><ellipse cx="290" cy="50" rx="22" ry="20" /><line x1="220" y1="50" x2="360" y2="50" /></g>
    </svg>
  );
  if (variant === 'oneline') {
    const fs = height * 1.375, oh = height;
    const word = { display: 'flex', alignItems: 'center', gap: height * 0.08, font: `700 ${fs}px/.72 'Public Sans', sans-serif`, letterSpacing: '.02em', color: c.text };
    return (
      <span {...aria} style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.66, ...style }} {...rest}>
        <svg viewBox="0 0 492 102" height={height} style={{ display: 'block', width: 'auto' }} aria-hidden="true"><path fillRule="evenodd" fill={c.letters} d={LET} /><path fillRule="evenodd" fill={c.o} d={OW} /></svg>
        <span style={word}><span>GL</span><MiniO c={c} height={oh} uid={uid + 'a'} /><span>BAL</span></span>
        <span style={word}><MiniO c={c} height={oh} uid={uid + 'b'} /><span>PS</span></span>
      </span>
    );
  }
  // horizontal (1b)
  const fs = height * 0.24;
  return (
    <span {...aria} style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.34, ...style }} {...rest}>
      <svg viewBox="0 -18 492 132" height={height} style={{ display: 'block', width: 'auto', overflow: 'visible' }} aria-hidden="true"><Globe c={c} letters uid={uid} /></svg>
      <span style={{ width: 1, height: height * 0.62, background: c.divider }} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: fs * 0.3 }}>
        <span style={{ font: `700 ${fs}px/1 'Public Sans', sans-serif`, letterSpacing: '.22em', color: c.text }}>GLOBAL</span>
        <span style={{ font: `700 ${fs}px/1 'Public Sans', sans-serif`, letterSpacing: '.22em', color: c.ops }}>OPS</span>
      </span>
    </span>
  );
}

// Fundo de grelha de globo (hero 7d/8d/9d): <GlobeGrid theme="dark" /> posicionado absolute atrás do conteúdo
export function GlobeGrid({ theme = 'dark', style }) {
  const c = GOP_THEMES[theme];
  return (
    <svg viewBox="0 0 420 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }} fill="none" stroke={c.grid} strokeWidth="1">
      <ellipse cx="210" cy="120" rx="200" ry="200" /><ellipse cx="210" cy="120" rx="130" ry="200" /><ellipse cx="210" cy="120" rx="60" ry="200" />
      <line x1="0" y1="50" x2="420" y2="50" /><line x1="0" y1="120" x2="420" y2="120" /><line x1="0" y1="190" x2="420" y2="190" />
    </svg>
  );
}
