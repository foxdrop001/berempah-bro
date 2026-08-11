/**
 * Build: renders every data-driven region of the site from data/site.json.
 *
 * Regions in the HTML are marked with:
 *   <!-- BUILD:name -->   ...generated...   <!-- /BUILD:name -->
 * Everything outside those markers is hand-authored and never touched.
 *
 * Outlet detail pages under locations/<slug>/ are generated wholesale.
 *
 * Usage: npm run build
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(path.join(ROOT, 'data', 'site.json'), 'utf8'));
const { site, menu, promo, catering } = data;
const outlets = data.outlets.filter((o) => o.published);
const base = site.baseUrl.replace(/\/$/, '');
let touched = 0;

const esc = (s) => String(s).replace(/&(?![a-z#0-9]+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mapsUrl = (o) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.mapsQuery)}`;

/** Replace a marked region inside a file. */
function region(file, name, html) {
  const p = path.join(ROOT, file);
  const src = readFileSync(p, 'utf8');
  const re = new RegExp(`(<!-- BUILD:${name} -->)[\\s\\S]*?(<!-- /BUILD:${name} -->)`);
  if (!re.test(src)) throw new Error(`Missing BUILD:${name} markers in ${file}`);
  const out = src.replace(re, `$1\n${html.trimEnd()}\n$2`);
  if (out !== src) { writeFileSync(p, out); touched++; console.log(`  updated ${file} → ${name}`); }
}

/* ------------------------------------------------------------------ *
 * Shared fragments
 * ------------------------------------------------------------------ */
const icon = {
  pin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
  train: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>',
  phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  spice: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
};

/* ------------------------------------------------------------------ *
 * 1. Locations index — outlet cards
 * ------------------------------------------------------------------ */
const locCards = outlets.map((o, i) => {
  const num = String(i + 1).padStart(2, '0');
  const hoursAttr = o.hours.open && o.hours.close ? ` data-hours="${o.hours.open}-${o.hours.close}"` : '';
  const brandStyle = o.brand !== 'Berempah Bros' ? ' style="border-color:var(--pandan)"' : '';
  const numStyle = o.brand !== 'Berempah Bros' ? ' style="background:var(--pandan);color:#fff"' : '';
  return `        <article class="loc-card reveal"${hoursAttr}${brandStyle}>
          <span class="loc-num"${numStyle}>NO. ${num} — ${esc(o.badge).toUpperCase()}</span>
          <h3><a href="${o.slug}/" style="text-decoration:none">${esc(o.name)}</a></h3>
          <p class="loc-line">${icon.pin} ${esc(o.address)}, S(${o.postal})</p>
          <p class="loc-line">${icon.clock} ${esc(o.hours.display)}</p>
          ${o.transport ? `<p class="loc-line">${icon.train} ${esc(o.transport)}</p>` : ''}
          ${o.phone ? `<p class="loc-line">${icon.phone} <a href="tel:${o.phone.replace(/\s/g, '')}" data-track="call" data-outlet="${o.slug}">${esc(o.phone)}</a></p>` : ''}
          ${o.note ? `<p class="loc-line">${icon.spice} ${esc(o.note)}</p>` : ''}
          <span class="loc-chip"><a href="${o.slug}/" style="text-decoration:none">Outlet page →</a></span>
          <span class="loc-chip"><a href="${mapsUrl(o)}" target="_blank" rel="noopener" style="text-decoration:none" data-track="directions" data-outlet="${o.slug}">Directions ↗</a></span>
          <span class="loc-chip"><a href="${site.orderUrl}" target="_blank" rel="noopener" style="text-decoration:none" data-track="order" data-outlet="${o.slug}">Order ↗</a></span>
        </article>`;
}).join('\n');
region('locations/index.html', 'outlets', locCards);

/* ------------------------------------------------------------------ *
 * 2. Menu page — cards, sides, builder, note
 * ------------------------------------------------------------------ */
const mains = menu.sections.flatMap((s) => s.items).filter((i) => i.slug !== 'feast2');
const menuCards = mains.map((it) => `        <article class="chit reveal">
          <div class="chit-photo">
            <img src="../assets/${it.image}.webp" srcset="../assets/sm/${it.image}.webp 800w, ../assets/${it.image}.webp 1149w" sizes="(max-width: 720px) 92vw, (max-width: 1024px) 46vw, 420px" alt="${esc(it.name)} — ${esc(it.desc)}" loading="lazy">
            <span class="chit-price">$${it.price}</span>
          </div>
          <div class="chit-body">
            <h3>${esc(it.name)}</h3>
            <p>${esc(it.desc)}</p>
            <div class="tag-row">${it.tags.map((t) => `<span class="tag${/best/i.test(t) ? ' best' : /spicy/i.test(t) ? ' hot' : ''}">${esc(t)}</span>`).join('')}</div>
          </div>
        </article>`).join('\n');
region('menu/index.html', 'menu-cards', menuCards);

const sidesRow = `        <h3>Sides</h3>\n` + menu.sides.map((s) => `        <span class="addon">${esc(s.name)} <b>$${s.price}</b></span>`).join('\n');
region('menu/index.html', 'sides', sidesRow);

const builderProteins = menu.sections.flatMap((s) => s.items).filter((i) => i.slug !== 'feast2')
  .map((it, i) => `              <label class="chip"><input type="radio" name="protein" value="${it.price}" data-name="${esc(it.name)}"${i === 0 ? ' checked' : ''}><span>${esc(it.name.replace(' Berempah', ''))} $${it.price}</span></label>`).join('\n');
region('menu/index.html', 'builder-proteins', builderProteins);

const builderCuts = menu.chickenParts.map((c, i) =>
  `              <label class="chip"><input type="radio" name="cut" value="${c}"${i === 0 ? ' checked' : ''}><span>${c}</span></label>`).join('\n');
region('menu/index.html', 'builder-cuts', builderCuts);

const builderAddons = menu.setAddOns.map((a) =>
  `              <label class="chip"><input type="checkbox" name="addon" value="${a.price}" data-name="${esc(a.name)}"><span>${esc(a.name.replace(' Berempah', ''))} +$${a.price}</span></label>`).join('\n');
region('menu/index.html', 'builder-addons', builderAddons);

region('menu/index.html', 'menu-note', `      <p class="menu-note">${menu.note}</p>`);

/* ------------------------------------------------------------------ *
 * 3. Promo block (menu page)
 * ------------------------------------------------------------------ */
const promoHtml = promo.active ? `      <div class="lto-chit reveal">
        <span class="lto-stamp" aria-hidden="true">Promo Code</span>
        <div class="lto-main">
          <span class="kicker">${esc(promo.kicker)}</span>
          <h2 id="lto-title" class="lto-title">${esc(promo.title)}</h2>
          <p class="lto-desc">${esc(promo.desc)}</p>
          <p class="lto-ends"><span data-lto="ends">First order only</span> <span class="hand">— use it lah</span></p>
        </div>
        <div class="lto-stub">
          <div class="lto-count" aria-hidden="true">
            <div class="lto-slot"><span class="lto-num" data-lto="d">--</span><span class="lto-lbl">days</span></div>
            <span class="lto-colon">:</span>
            <div class="lto-slot"><span class="lto-num" data-lto="h">--</span><span class="lto-lbl">hrs</span></div>
            <span class="lto-colon">:</span>
            <div class="lto-slot"><span class="lto-num" data-lto="m">--</span><span class="lto-lbl">mins</span></div>
          </div>
          <a class="btn btn-gold lto-cta" href="${promo.url}" target="_blank" rel="noopener" data-track="promo" data-promo="${esc(promo.code)}">
            <span class="lto-cta-txt">${esc(promo.cta)}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>
      </div>` : '      <!-- promo inactive -->';
region('menu/index.html', 'promo', promoHtml);


/* Catering form outlet dropdown */
region('contact/index.html', 'catering-outlets',
  ['                <option>No preference</option>',
    ...outlets.map((o) => `                <option value="${esc(o.name)}">${esc(o.name)}</option>`)].join('\n'));

/* ------------------------------------------------------------------ *
 * 4. Home — stats + JSON-LD
 * ------------------------------------------------------------------ */
const bbCount = outlets.filter((o) => o.brand === 'Berempah Bros').length;
const totalStalls = outlets.length + (data.outlets.some((o) => !o.published) ? 1 : 0);
region('index.html', 'hero-stats', `        <div><b>16</b>spices in the rempah</div>
        <div><b>${totalStalls}</b>stalls · ${new Set(outlets.map((o) => o.brand)).size} brands</div>
        <div><b>$${mains[0].price.replace('.00', '')}</b>signature ayam set</div>
        <div><b>#1</b>MasterChef SG S2</div>`);

const restaurantLd = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: site.name,
  servesCuisine: ['Malaysian', 'Singaporean'],
  founder: { '@type': 'Person', name: 'Derek Cheong' },
  slogan: site.tagline,
  sameAs: [site.instagram, site.sisterBrandInstagram].filter(Boolean),
  email: site.email,
  menu: site.orderUrl,
  location: outlets.map((o) => ({
    '@type': 'FoodEstablishment',
    name: `${o.brand} — ${o.name}`,
    url: `${base}/locations/${o.slug}/`,
    address: { '@type': 'PostalAddress', streetAddress: o.address, postalCode: o.postal, addressCountry: 'SG' },
    ...(o.phone ? { telephone: o.phone } : {}),
    geo: { '@type': 'GeoCoordinates', latitude: o.geo.lat, longitude: o.geo.lng },
    ...(o.hours.open ? {
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: o.hours.open, closes: o.hours.close,
      },
    } : {}),
  })),
};
region('index.html', 'jsonld', `<script type="application/ld+json">\n${JSON.stringify(restaurantLd, null, 2)}\n</script>`);

/* ------------------------------------------------------------------ *
 * 5. Menu JSON-LD
 * ------------------------------------------------------------------ */
const menuLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
      { '@type': 'ListItem', position: 2, name: 'Menu', item: `${base}/menu/` }] },
    { '@type': 'Menu', name: `${site.name} Delivery Menu`, inLanguage: 'en-SG',
      hasMenuSection: [
        ...menu.sections.map((s) => ({ '@type': 'MenuSection', name: s.name,
          hasMenuItem: s.items.map((i) => ({ '@type': 'MenuItem', name: i.name,
            ...(i.menuDesc ? { description: i.menuDesc.replace(/&amp;/g, '&') } : {}),
            offers: { '@type': 'Offer', price: i.price, priceCurrency: 'SGD' } })) })),
        { '@type': 'MenuSection', name: 'Sides', hasMenuItem: menu.sides.map((s) => ({
          '@type': 'MenuItem', name: s.name, offers: { '@type': 'Offer', price: s.price, priceCurrency: 'SGD' } })) },
      ] },
  ],
};
region('menu/index.html', 'jsonld', `<script type="application/ld+json">\n${JSON.stringify(menuLd, null, 2)}\n</script>`);

/* ------------------------------------------------------------------ *
 * 6. Outlet detail pages
 * ------------------------------------------------------------------ */
const shell = readFileSync(path.join(ROOT, 'templates', 'outlet.html'), 'utf8');
const outletsDir = path.join(ROOT, 'locations');
// clear previously generated dirs (they carry a marker file)
for (const d of readdirSync(outletsDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  if (existsSync(path.join(outletsDir, d.name, '.generated'))) rmSync(path.join(outletsDir, d.name), { recursive: true });
}

for (const o of outlets) {
  const dir = path.join(outletsDir, o.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, '.generated'), 'generated by build.mjs — do not edit this folder by hand\n');

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: `${o.brand} — ${o.name}`,
    url: `${base}/locations/${o.slug}/`,
    image: `${base}/assets/og-image.jpg`,
    servesCuisine: ['Malaysian', 'Singaporean'],
    priceRange: '$$',
    address: { '@type': 'PostalAddress', streetAddress: o.address, addressLocality: 'Singapore', postalCode: o.postal, addressCountry: 'SG' },
    geo: { '@type': 'GeoCoordinates', latitude: o.geo.lat, longitude: o.geo.lng },
    ...(o.phone ? { telephone: o.phone } : {}),
    hasMap: mapsUrl(o),
    menu: site.orderUrl,
    parentOrganization: { '@type': 'Organization', name: site.name, url: `${base}/` },
    ...(o.hours.open ? { openingHoursSpecification: { '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: o.hours.open, closes: o.hours.close } } : {}),
  };
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
      { '@type': 'ListItem', position: 2, name: 'Locations', item: `${base}/locations/` },
      { '@type': 'ListItem', position: 3, name: o.name, item: `${base}/locations/${o.slug}/` }],
  };

  const details = [
    `<p class="loc-line">${icon.pin} <span>${esc(o.address)}<br>Singapore ${o.postal}</span></p>`,
    `<p class="loc-line">${icon.clock} ${esc(o.hours.display)}</p>`,
    o.transport ? `<p class="loc-line">${icon.train} ${esc(o.transport)}</p>` : '',
    o.phone ? `<p class="loc-line">${icon.phone} <a href="tel:${o.phone.replace(/\s/g, '')}" data-track="call" data-outlet="${o.slug}">${esc(o.phone)}</a></p>` : '',
    o.note ? `<p class="loc-line">${icon.spice} ${esc(o.note)}</p>` : '',
  ].filter(Boolean).join('\n            ');

  const others = outlets.filter((x) => x.slug !== o.slug).map((x) =>
    `          <a class="loc-chip" href="../${x.slug}/" style="text-decoration:none">${esc(x.name)}</a>`).join('\n');

  const html = shell
    .replace(/\{\{TITLE\}\}/g, `${esc(o.name)} — ${esc(o.brand)} | Singapore`)
    .replace(/\{\{DESC\}\}/g, `${esc(o.brand)} at ${esc(o.name)} — ${esc(o.address)}, Singapore ${o.postal}. ${esc(o.hours.display)}. Directions, hours and islandwide delivery.`)
    .replace(/\{\{SLUG\}\}/g, o.slug)
    .replace(/\{\{BASE\}\}/g, base)
    .replace(/\{\{JSONLD\}\}/g, `${JSON.stringify(ld, null, 2)}\n</script>\n<script type="application/ld+json">\n${JSON.stringify(crumbs, null, 2)}`)
    .replace(/\{\{BADGE\}\}/g, esc(o.badge))
    .replace(/\{\{BRAND\}\}/g, esc(o.brand))
    .replace(/\{\{NAME\}\}/g, esc(o.name))
    .replace(/\{\{DETAILS\}\}/g, details)
    .replace(/\{\{MAPS\}\}/g, mapsUrl(o))
    .replace(/\{\{ORDER\}\}/g, site.orderUrl)
    .replace(/\{\{OTHERS\}\}/g, others)
    .replace(/\{\{HOURS_ATTR\}\}/g, o.hours.open ? ` data-hours="${o.hours.open}-${o.hours.close}"` : '');
  writeFileSync(path.join(dir, 'index.html'), html);
  touched++;
  console.log(`  generated locations/${o.slug}/`);
}

/* ------------------------------------------------------------------ *
 * 7. Sitemap
 * ------------------------------------------------------------------ */
const today = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
const urls = ['', 'story/', 'menu/', 'locations/', 'careers/', 'contact/', 'news/',
  ...outlets.map((o) => `locations/${o.slug}/`)];
writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${base}/${u}</loc><lastmod>${today}</lastmod><changefreq>${u === '' || u === 'news/' ? 'weekly' : 'monthly'}</changefreq></url>`).join('\n') +
  `\n</urlset>\n`);
console.log(`  sitemap.xml (${urls.length} urls)`);

/* ------------------------------------------------------------------ *
 * 8. Analytics config (shared by every page)
 * ------------------------------------------------------------------ */
writeFileSync(path.join(ROOT, 'assets', 'analytics-config.js'),
  `/* generated by build.mjs from data/site.json */\nwindow.BB_GA4_ID = ${site.analytics.ga4MeasurementId ? `'${site.analytics.ga4MeasurementId}'` : 'null'};\n`);
console.log('  assets/analytics-config.js');

console.log(`\nBuild complete — ${touched} files written, ${outlets.length} outlets published.`);
