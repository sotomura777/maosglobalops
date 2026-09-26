import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('.', import.meta.url));
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/Users/pedroferreira/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
try {
  const page = await browser.newPage({viewport:{width:1200,height:1000}});
  await page.goto(new URL('relatorio.html',import.meta.url).href);
  assert.equal(await page.locator('h1').count(),1);
  assert.equal(await page.locator('h2').count(),17);
  assert.equal(await page.locator('main > ol > li').count(),25);
  assert.equal(await page.locator('table').count(),7);
  await page.screenshot({path:'/private/tmp/globalops-research-report.png'});
  const pdf = await page.pdf({path:root+'relatorio.pdf',format:'A4',printBackground:true,preferCSSPageSize:true,tagged:true,outline:true});
  const pages=(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;
  await page.setViewportSize({width:390,height:844});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  assert.equal(overflow,false);
  console.log(JSON.stringify({pdfBytes:pdf.length,pages,sections:17,sources:25,tables:7,mobileOverflow:false}));
} finally { await browser.close(); }
