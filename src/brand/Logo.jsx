import GlobalOpsLogo, { GOP_THEMES } from "./GlobalOpsLogo";
import { useTheme } from "../theme";

// O logo no modo atual. bg é a cor real do fundo (usada na folga onde a órbita passa à frente do O).
const SURFACE = { dark: "#0A0A0B", light: "#F7F4EF" };
export default function Logo({ colors, surface, ...props }) {
  const { theme } = useTheme();
  return (
    <GlobalOpsLogo
      theme={theme}
      {...props}
      colors={{ bg: surface?.[theme] || SURFACE[theme], ...colors }}
    />
  );
}

// Logo da GlobalOps para barras de topo: o MAOS-globo e "GLOBAL / OPS" em letra legível.
// (A variante horizontal do kit escala o texto com a altura e fica ilegível a esta dimensão.)
// muted: versão discreta em cinzento (rodapés).
const MUTED = { letters: "var(--text-3)", o: "var(--text-4)", accent: "var(--text-4)", dot: "var(--text-3)", text: "var(--text-3)", ops: "var(--text-4)" };
export function Wordmark({ height = 28, textSize = 12, className, surface, muted = false }) {
  const { theme } = useTheme();
  const c = muted ? { ...GOP_THEMES[theme], ...MUTED } : GOP_THEMES[theme];
  const word = { font: `700 ${textSize}px/1 'Public Sans', sans-serif`, letterSpacing: ".22em" };
  return (
    <span className={className} role="img" aria-label="MaosGlobalOps" style={{ display: "inline-flex", alignItems: "center", gap: Math.round(textSize * 0.9) }}>
      <GlobalOpsLogo
        variant="globe"
        height={height}
        title=""
        aria-hidden="true"
        theme={theme}
        colors={{ ...(muted ? MUTED : {}), bg: surface?.[theme] || SURFACE[theme] }}
      />
      <span aria-hidden="true" style={{ width: 1, height: Math.round(height * 0.7), background: c.divider }} />
      <span aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: Math.round(textSize * 0.35) }}>
        <span style={{ ...word, color: c.text }}>GLOBAL</span>
        <span style={{ ...word, color: c.ops }}>OPS</span>
      </span>
    </span>
  );
}
