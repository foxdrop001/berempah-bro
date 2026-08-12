import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] || 'index.html';
const target0 = target;
const url = 'file:///' + path.join(here, target).split(path.sep).join('/');
const issues = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleErrs = [];
// Failures fetching third-party resources (fonts, analytics) are network
// conditions, not defects in this site — counting them makes CI flaky. Local
// failures and any script error still fail the audit.
const isThirdPartyNetworkNoise = (text) =>
  /Failed to load resource/i.test(text) &&
  !/file:\/\/|localhost|127\.0\.0\.1/i.test(text);
page.on('console', m => {
  if (m.type() !== 'error') return;
  const text = m.text();
  const url = m.location?.().url || '';
  const external = /^https?:\/\//i.test(url) && !/localhost|127\.0\.0\.1/i.test(url);
  if (external && isThirdPartyNetworkNoise(text)) {
    console.log(`  (ignored third-party network error: ${url})`);
    return;
  }
  consoleErrs.push(text);
});
page.on('pageerror', e => consoleErrs.push('pageerror: ' + e.message));
await page.goto(url, { waitUntil: 'load' });

// full scroll to trigger lazy loads + observers, then wait for every image to settle
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); }
});
await page.waitForFunction(
  () => [...document.images].every(i => i.complete),
  null, { timeout: 15000 }
).catch(() => {});
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);

// 1. images
const imgReport = await page.evaluate(() =>
  [...document.images].map(i => ({
    src: (i.getAttribute('src') || '').startsWith('data:') ? 'data-uri' : i.getAttribute('src'),
    ok: i.complete && i.naturalWidth > 0,
    alt: i.getAttribute('alt'),
  })));
imgReport.forEach((r, i) => {
  if (!r.ok) issues.push(`IMG BROKEN: [${i}] ${r.src} (alt: ${r.alt})`);
  if (r.alt === null) issues.push(`IMG NO ALT ATTR: [${i}] ${r.src}`);
});

// 2. anchors
const anchors = await page.evaluate(() =>
  [...document.querySelectorAll('a[href]')].map(a => ({
    href: a.getAttribute('href'),
    text: (a.textContent || '').trim().slice(0, 40),
    targetBlank: a.target === '_blank',
    rel: a.rel,
  })));
const externals = new Set();
for (const a of anchors) {
  if (a.href.startsWith('#')) {
    const exists = await page.evaluate(sel => !!document.getElementById(sel), a.href.slice(1));
    if (!exists) issues.push(`DEAD ANCHOR: ${a.href} ("${a.text}")`);
  } else if (/^(\.\/|(\.\.\/)*)([\w-]+\/)*(index\.html)?(#[\w-]+)?$/.test(a.href) || /^(\.\.\/)*[\w-]+\.html(#[\w-]+)?$/.test(a.href)) {
    const clean = a.href.split('#')[0];
    const { existsSync } = await import('fs');
    const dir = path.dirname(path.join(here, target0));
    let target = null;
    if (clean !== '') {
      target = clean.endsWith('.html')
        ? path.resolve(dir, clean)
        : path.resolve(dir, clean, 'index.html');
    }
    if (target && !existsSync(target)) issues.push(`DEAD PAGE LINK: ${a.href} (looked for ${path.relative(here, target)})`);
  } else if (a.href.startsWith('mailto:') || a.href.startsWith('tel:')) {
    if (!/^mailto:[^@\s]+@[^@\s]+\.[^@\s?]+(\?.*)?$/.test(a.href) && a.href.startsWith('mailto:')) issues.push(`MALFORMED MAILTO: ${a.href}`);
  } else if (a.href.startsWith('http')) {
    externals.add(a.href);
    if (a.targetBlank && !a.rel.includes('noopener')) issues.push(`MISSING noopener: ${a.href}`);
  } else {
    issues.push(`ODD HREF: ${a.href} ("${a.text}")`);
  }
}

// 3. duplicate ids + aria-labelledby integrity + JSON-LD
const domChecks = await page.evaluate(() => {
  const out = [];
  const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
  const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dupes.length) out.push('DUPLICATE IDS: ' + [...new Set(dupes)].join(', '));
  document.querySelectorAll('[aria-labelledby]').forEach(e => {
    e.getAttribute('aria-labelledby').split(/\s+/).forEach(id => {
      if (!document.getElementById(id)) out.push(`ARIA-LABELLEDBY dead ref: ${id}`);
    });
  });
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s, i) => {
    try { JSON.parse(s.textContent); } catch (e) { out.push(`JSON-LD ${i} INVALID: ${e.message}`); }
  });
  return out;
});
issues.push(...domChecks);

// 4. interactions
async function expect(cond, label) { if (!(await cond)) issues.push('INTERACTION FAIL: ' + label); }

// interaction checks — each feature guarded by its own presence
const hasBuilder = await page.evaluate(() => !!document.getElementById('builderForm'));
if (hasBuilder) {
  await page.locator('#menu').scrollIntoViewIfNeeded();
  const unagi = page.locator('#builderForm input[data-name="Unagi Berempah"]');
  await unagi.check({ force: true });
  await expect(page.evaluate(() => document.getElementById('builderSum').textContent === '14.40'), 'builder: unagi = 14.40');
  await page.locator('#builderForm input[data-name="Otah Berempah"]').check({ force: true });
  await expect(page.evaluate(() => document.getElementById('builderSum').textContent === '16.22'), 'builder: unagi(14.40) + otah(1.82) = 16.22');
  await expect(page.evaluate(() => {
    const g = document.getElementById('cutGroup');
    return [...g.querySelectorAll('input')].every(i => i.disabled);
  }), 'builder: cut disabled for non-ayam');
  await page.locator('#builderForm input[data-name="Ayam Berempah"]').check({ force: true });
  await expect(page.evaluate(() => document.getElementById('builderSum').textContent === '10.82'), 'builder: ayam(9.00) + otah(1.82) = 10.82');
  await expect(page.evaluate(() => document.getElementById('builderDesc').textContent.includes('Ayam Berempah (Thigh)')), 'builder: desc shows ayam with cut');
}

if (await page.evaluate(() => !!document.querySelector('.lto'))) {
  await expect(page.evaluate(() => {
    const p = document.querySelector('.lto');
    return p && !p.hidden && p.textContent.includes('BEREMPAH6');
  }), 'promo visible with BEREMPAH6');
  await expect(page.evaluate(() => {
    const c = document.querySelector('.lto-count');
    return c && getComputedStyle(c).display === 'none';
  }), 'promo countdown hidden (evergreen)');
}

if (await page.evaluate(() => !!document.querySelector('.faq-item'))) {
  const faq = page.locator('.faq-item').first();
  await faq.locator('summary').click();
  await expect(faq.evaluate(el => el.open), 'FAQ opens on click');
}

const hoursCards = await page.evaluate(() => document.querySelectorAll('[data-hours]').length);
if (hoursCards > 0) {
  await expect(page.evaluate(n => document.querySelectorAll('.loc-card .loc-chip.open, .loc-card .loc-chip.closed').length === n, hoursCards), `open-now chips rendered for all ${hoursCards} outlets with hours`);
}

if (await page.evaluate(() => !!document.getElementById('clubForm'))) {
  await page.locator('#club').scrollIntoViewIfNeeded();
  await page.locator('#clubEmail').fill('not-an-email');
  await page.locator('#clubForm button[type="submit"]').click();
  await expect(page.evaluate(() => document.getElementById('clubError').textContent.length > 0), 'club: invalid email shows error');
  await expect(page.evaluate(() => {
    const f = document.getElementById('clubForm');
    return f.action.includes('formsubmit.co') &&
           !!f.querySelector('input[name="_honey"]') &&
           !!f.querySelector('input[name="_captcha"][value="true"]') &&
           !!f.querySelector('input[name="_subject"]');
  }), 'club: real signup endpoint with honeypot + captcha + subject');
}

// mobile nav + overflow at 3 widths
for (const w of [1280, 768, 375]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(300);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (ov > 0) issues.push(`OVERFLOW at ${w}px: ${ov}px`);
}
await page.locator('#navToggle').click();
await expect(page.evaluate(() => document.getElementById('navLinks').classList.contains('open')), 'mobile nav opens');
await expect(page.evaluate(() => document.querySelector('.order-bar a') && getComputedStyle(document.querySelector('.order-bar')).display !== 'none'), 'mobile sticky order bar visible');

if (consoleErrs.length) issues.push(...consoleErrs.map(e => 'CONSOLE: ' + e));

console.log('=== EXTERNAL URLS ===');
console.log([...externals].join('\n'));
console.log('=== ISSUES (' + issues.length + ') ===');
console.log(issues.length ? issues.join('\n') : 'NONE — ALL CHECKS PASSED');
console.log(`(images: ${imgReport.length}, anchors: ${anchors.length})`);
await browser.close();
