import { useEffect, useState } from "react";
// Modo claro/escuro. A preferência ("auto", "dark" ou "light") fica neste browser.
// O index.html aplica-a antes de a app carregar, para não haver flash do modo errado.
const KEY = "gop-theme";
const CHANGED = "gop-theme-change";
const BAR = { dark: "#0A0A0B", light: "#F7F4EF" };
const systemLight = () => window.matchMedia?.("(prefers-color-scheme: light)").matches;

export function readPreference() {
  try {
    return localStorage.getItem(KEY) || "auto";
  } catch {
    return "auto";
  }
}
export const resolveTheme = (pref) =>
  pref === "light" || pref === "dark" ? pref : systemLight() ? "light" : "dark";

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BAR[theme]);
}

export function setPreference(pref) {
  try {
    if (pref === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Sem armazenamento (modo privado): vale só para esta visita.
  }
  apply(resolveTheme(pref));
  window.dispatchEvent(new Event(CHANGED));
}

// Todos os componentes que usam o hook ficam sincronizados (barra de topo, conta, logo).
export function useTheme() {
  const [pref, setPref] = useState(readPreference);
  const [theme, setTheme] = useState(() => resolveTheme(readPreference()));
  useEffect(() => {
    const sync = () => {
      const p = readPreference();
      setPref(p);
      setTheme(resolveTheme(p));
      apply(resolveTheme(p));
    };
    const media = window.matchMedia?.("(prefers-color-scheme: light)");
    window.addEventListener(CHANGED, sync);
    window.addEventListener("storage", sync);
    media?.addEventListener("change", sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener("storage", sync);
      media?.removeEventListener("change", sync);
    };
  }, []);
  return { pref, theme };
}
