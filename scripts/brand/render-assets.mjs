// Gera os ícones da app, o favicon e a imagem de partilha a partir do logo em
// src/brand/GlobalOpsLogo.jsx (tema escuro: preto e dourado).
//   node scripts/brand/render-assets.mjs
// Usa o Chromium do Playwright (já instalado para os testes). Escreve em public/.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const root = new URL("../../", import.meta.url);
const src = await readFile(new URL("src/brand/GlobalOpsLogo.jsx", root), "utf8");
const constant = (name) => src.match(new RegExp(`const ${name} = "([^"]+)"`))[1];
const LET = constant("LET"),
  OW = constant("OW"),
  FRONT = constant("FRONT");
const DARK = { letters: "#EEF1F2", o: "#F0C96A", accent: "#F0C96A", dot: "#EEF1F2", bg: "#0A0A0B" };

// O mesmo desenho do componente (Globe), em SVG simples.
const globe = (c, letters) => `
  <defs>
    <clipPath id="h"><rect x="226" y="34" width="128" height="32" rx="16"/></clipPath>
    <clipPath id="f"><rect x="197" y="-40" width="186" height="190"/></clipPath>
  </defs>
  <ellipse cx="290" cy="50" rx="104" ry="54" transform="rotate(-12 290 50)" fill="none" stroke="${c.accent}" stroke-width="3"/>
  ${letters ? `<path fill-rule="evenodd" fill="${c.letters}" d="${LET}"/>` : ""}
  <path fill-rule="evenodd" fill="${c.o}" stroke="${c.bg}" stroke-width="7" paint-order="stroke" d="${OW}"/>
  <g clip-path="url(#h)" fill="none" stroke="${c.accent}" stroke-width="1.8">
    <ellipse cx="290" cy="50" rx="14" ry="17"/><ellipse cx="290" cy="50" rx="34" ry="17"/>
    <ellipse cx="290" cy="50" rx="56" ry="17"/><line x1="220" y1="50" x2="360" y2="50"/>
  </g>
  <g clip-path="url(#f)"><g transform="rotate(-12 290 50)">
    <path d="${FRONT}" fill="none" stroke="${c.bg}" stroke-width="9"/>
    <path d="${FRONT}" fill="none" stroke="${c.accent}" stroke-width="3"/>
  </g></g>
  <circle cx="318.1" cy="-7.1" r="6" fill="${c.dot}" stroke="${c.bg}" stroke-width="3" paint-order="stroke"/>`;

// Ícone quadrado: símbolo centrado com a largura indicada (fração do lado).
const appIcon = (share) => {
  const w = 222 / share; // viewBox do símbolo tem 222 de largura
  const x = 180 - (w - 222) / 2,
    y = 48 - w / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${w}">
    <rect x="${x}" y="${y}" width="${w}" height="${w}" fill="${DARK.bg}"/>${globe(DARK, false)}</svg>`;
};

// Favicon: a 16 px a órbita e os meridianos desaparecem, por isso só o O dourado grosso com o equador.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${DARK.bg}"/>
  <rect x="7" y="17" width="50" height="30" rx="15" fill="none" stroke="${DARK.o}" stroke-width="8"/>
  <line x1="15" y1="32" x2="49" y2="32" stroke="${DARK.o}" stroke-width="3"/>
</svg>`;

const font = async (weight) =>
  (await readFile(new URL(`node_modules/@fontsource/public-sans/files/public-sans-latin-${weight}-normal.woff2`, root))).toString("base64");
const og = `<!doctype html><html><head><style>
  @font-face { font-family: PS; font-weight: 700; src: url(data:font/woff2;base64,${await font(700)}) format("woff2"); }
  @font-face { font-family: PS; font-weight: 400; src: url(data:font/woff2;base64,${await font(400)}) format("woff2"); }
  html, body { margin: 0; }
  .card { width: 1200px; height: 630px; background: radial-gradient(70% 110% at 50% -10%, #1C1E22 0%, #0F1012 48%, #0A0A0B 100%);
    position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 34px; }
  .grid { position: absolute; inset: 0; width: 100%; height: 100%; }
  .kicker { font: 700 26px/1 PS; letter-spacing: .32em; color: #EEF1F2; position: relative; }
  .kicker b { color: #F0C96A; font-weight: 700; }
  .tag { font: 400 30px/1.3 PS; color: #8A9299; position: relative; }
</style></head><body><div class="card">
  <svg class="grid" viewBox="0 0 420 240" preserveAspectRatio="xMidYMid slice" fill="none" stroke="rgba(240,201,106,.10)" stroke-width="1">
    <ellipse cx="210" cy="120" rx="200" ry="200"/><ellipse cx="210" cy="120" rx="130" ry="200"/><ellipse cx="210" cy="120" rx="60" ry="200"/>
    <line x1="0" y1="50" x2="420" y2="50"/><line x1="0" y1="120" x2="420" y2="120"/><line x1="0" y1="190" x2="420" y2="190"/>
  </svg>
  <svg viewBox="0 -18 492 132" width="640" style="position:relative;overflow:visible">${globe(DARK, true)}</svg>
  <div class="kicker">GLOBAL <b>OPS</b></div>
  <div class="tag">O teu próximo trabalho em eventos e restauração.</div>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
// transparent: os cantos arredondados do favicon ficam transparentes em vez de brancos.
const png = async (html, size, file, transparent = false) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${html.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await page.screenshot({
    path: new URL(file, root).pathname,
    clip: { x: 0, y: 0, width: size, height: size },
    omitBackground: transparent,
  });
};
await mkdir(new URL("public/icons", root), { recursive: true });
// Ícone normal: símbolo a 72% do lado. Maskable: 56%, dentro da zona segura (círculo de 80%).
await png(appIcon(0.72), 512, "public/icons/icon-512.png");
await png(appIcon(0.72), 192, "public/icons/icon-192.png");
await png(appIcon(0.72), 180, "public/icons/apple-touch-icon.png");
await png(appIcon(0.56), 512, "public/icons/maskable-512.png");
await png(favicon, 32, "public/icons/icon-32.png", true);
await writeFile(new URL("public/favicon.svg", root), favicon);
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(og);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: new URL("public/og.png", root).pathname, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log("Ícones, favicon e imagem de partilha gerados em public/.");
