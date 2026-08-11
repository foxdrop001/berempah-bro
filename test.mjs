/**
 * Test runner: data integrity first (fast, no browser), then the page audit
 * across every page. Exits non-zero on the first failing gate so CI stops early.
 *
 * Usage: npm test
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const fail = [];
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => { console.log(`  ✗ ${msg}`); fail.push(msg); };

console.log('\n1. Data integrity (data/site.json)');
const data = JSON.parse(readFileSync(path.join(ROOT, 'data', 'site.json'), 'utf8'));
const outlets = data.outlets.filter((o) => o.published);

if (outlets.length) ok(`${outlets.length} published outlets`); else bad('no published outlets');

const slugs = new Set();
for (const o of data.outlets) {
  const where = `outlet "${o.slug}"`;
  if (slugs.has(o.slug)) bad(`${where}: duplicate slug`);
  slugs.add(o.slug);
  if (!/^[a-z0-9-]+$/.test(o.slug)) bad(`${where}: slug must be lowercase-kebab`);
  if (!o.published) continue;
  for (const field of ['brand', 'name', 'address', 'postal', 'mapsQuery']) {
    if (!o[field]) bad(`${where}: missing ${field}`);
  }
  if (!/^\d{6}$/.test(String(o.postal))) bad(`${where}: postal must be 6 digits (got ${o.postal})`);
  if (!o.geo || typeof o.geo.lat !== 'number' || typeof o.geo.lng !== 'number') bad(`${where}: geo lat/lng required`);
  else if (o.geo.lat < 1.15 || o.geo.lat > 1.48 || o.geo.lng < 103.6 || o.geo.lng > 104.1) bad(`${where}: geo outside Singapore`);
  if (o.hours.open && !/^\d{2}:\d{2}$/.test(o.hours.open)) bad(`${where}: hours.open must be HH:MM`);
  if (o.hours.open && !o.hours.display.match(/\d/)) bad(`${where}: hours.display should state the times`);
  if (o.phone && !/^\+65 ?\d{4} ?\d{4}$/.test(o.phone)) bad(`${where}: phone must be +65 XXXX XXXX`);
  if (!existsSync(path.join(ROOT, 'locations', o.slug, 'index.html'))) bad(`${where}: page not generated — run npm run build`);
}
if (!fail.length) ok('every published outlet has required fields, valid postal/geo/hours/phone');

const prices = [];
for (const s of data.menu.sections) for (const i of s.items) {
  if (!/^\d+\.\d{2}$/.test(i.price)) bad(`menu item ${i.name}: price must be like 9.00`);
  if (!existsSync(path.join(ROOT, 'assets', `${i.image}.webp`))) bad(`menu item ${i.name}: assets/${i.image}.webp missing`);
  prices.push(i.price);
}
for (const s of [...data.menu.sides, ...data.menu.setAddOns]) {
  if (!/^\d+\.\d{2}$/.test(s.price)) bad(`${s.name}: price must be like 1.80`);
}
ok(`${prices.length} main prices + ${data.menu.sides.length} sides + ${data.menu.setAddOns.length} add-ons well-formed`);

if (data.promo.active && !data.promo.code) bad('promo active but has no code');
if (data.promo.endsISO && Number.isNaN(Date.parse(data.promo.endsISO))) bad('promo.endsISO is not a valid date');
ok('promo config valid');

console.log('\n2. Build is current (no uncommitted drift)');
try {
  execFileSync('node', [path.join(ROOT, 'build.mjs')], { cwd: ROOT, stdio: 'pipe' });
  ok('build.mjs runs clean');
} catch (e) {
  bad(`build failed: ${e.stderr?.toString().split('\n')[0] || e.message}`);
}

console.log('\n3. Page audits');
const pages = ['index.html', 'story/index.html', 'menu/index.html', 'locations/index.html',
  'careers/index.html', 'contact/index.html', 'news/index.html',
  ...outlets.map((o) => `locations/${o.slug}/index.html`)];

for (const p of pages) {
  try {
    const out = execFileSync('node', [path.join(ROOT, 'audit.mjs'), p], { cwd: ROOT, encoding: 'utf8' });
    if (out.includes('NONE — ALL CHECKS PASSED')) ok(p);
    else { const issues = out.split('=== ISSUES')[1] || out; bad(`${p}\n${issues.trim()}`); }
  } catch (e) {
    bad(`${p}: audit crashed — ${(e.stdout || e.message).toString().split('\n').slice(-3).join(' ')}`);
  }
}

console.log(fail.length ? `\nFAILED (${fail.length})\n` : `\nAll checks passed (${pages.length} pages).\n`);
process.exit(fail.length ? 1 : 0);
