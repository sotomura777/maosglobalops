import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../src/index.css", import.meta.url), "utf8");
const block = (selector) => {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `falta o bloco ${selector}`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]),
  );
};
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const themes = { escuro: block(":root"), claro: { ...block(":root"), ...block(':root[data-theme="light"]') } };
const TEXT = ["--text", "--text-2", "--text-3", "--text-4", "--text-5", "--gold", "--green", "--danger-text"];

for (const [name, t] of Object.entries(themes))
  test(`modo ${name}: todo o texto passa o contraste AA (4,5:1)`, () => {
    for (const fg of TEXT)
      for (const bg of ["--bg", "--card"]) {
        assert.ok(t[fg] && t[bg], `${fg} ou ${bg} em falta`);
        const ratio = contrast(t[fg], t[bg]);
        assert.ok(ratio >= 4.5, `${fg} ${t[fg]} sobre ${bg} ${t[bg]}: ${ratio.toFixed(2)}`);
      }
    // Texto do botão principal sobre a cor de destaque.
    const button = contrast(t["--on-gold"], t["--gold"]);
    assert.ok(button >= 4.5, `--on-gold sobre --gold: ${button.toFixed(2)}`);
  });
