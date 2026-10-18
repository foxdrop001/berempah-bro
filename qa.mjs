import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = 'file:///' + path.join(here, 'index.html').replace(/\\/g, '/');
const outDir = process.env.QA_OUT || path.join(here, 'qa');

const browser = await chromium.launch();
const errors = [];
const shots = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.width, height: s.height } });
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${s.name}] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[${s.name}] pageerror: ${e.message}`));
  await page.goto(url, { waitUntil: 'networkidle' });
  // make every .reveal element visible so the full-page screenshot shows it
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach(el => el.classList.add('in')));
  await page.waitForTimeout(600);
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) errors.push(`[${s.name}] HORIZONTAL OVERFLOW: ${overflow}px`);
  await page.screenshot({ path: path.join(outDir, `${s.name}.png`), fullPage: true });
  await page.close();
}
await browser.close();
console.log(errors.length ? 'ISSUES:\n' + errors.join('\n') : 'CLEAN');
