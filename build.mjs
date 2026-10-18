/**
 * Build: renders every data-driven region of the site from data/site.json.
 *
 * Regions in the HTML are marked with:
 *   <!-- BUILD:name -->   ...generated...   <!-- /BUILD:name -->
 * Anything outside the markers is written by hand and the build leaves it alone.
 *
 * The outlet pages under locations/<slug>/ are generated in full.
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
const comingSoon = Array.isArray(data.comingSoon) ? data.comingSoon : [];
const base = site.baseUrl.replace(/\/$/, '');
let touched = 0;

const esc = (s) => String(s).replace(/&(?![a-z#0-9]+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// The slug is used as a folder name and in the URL. A slug that doesn't match
// this pattern could write files outside the project (e.g. "../../elsewhere")
// or give a broken URL, so stop the build instead of trusting the data file.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
for (const o of data.outlets) {
  if (!SLUG_RE.test(String(o.slug ?? ''))) {
    throw new Error(
      `Invalid outlet slug ${JSON.stringify(o.slug)} (outlet: ${o.name ?? 'unnamed'}).\n` +
      '  Slugs must be lowercase letters, digits and single hyphens, e.g. "bukit-canberra".');
  }
}
const dupes = data.outlets.map((o) => o.slug).filter((s, i, a) => a.indexOf(s) !== i);
if (dupes.length) throw new Error(`Duplicate outlet slug(s): ${[...new Set(dupes)].join(', ')}`);
const mapsUrl = (o) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.mapsQuery)}`;
// Full name for structured data is brand and location joined with an em dash.
// If the outlet name already starts with the brand (e.g. the Gepuk Guys
// outlet), use the name as is so the brand isn't repeated.
const fullName = (o) => (o.brand && o.name.startsWith(o.brand)) ? o.name : [o.brand, o.name].filter(Boolean).join(' — ');

/** Replaces a marked region in a file. Pages are kept in memory and written
 *  once at the end, instead of reading and writing the file for every region. */
const pages = new Map(); // file path: { orig, cur }
function region(file, name, html) {
  let page = pages.get(file);
  if (!page) {
    const src = readFileSync(path.join(ROOT, file), 'utf8');
    page = { orig: src, cur: src };
    pages.set(file, page);
  }
  const re = new RegExp(`(<!-- BUILD:${name} -->)[\\s\\S]*?(<!-- /BUILD:${name} -->)`);
  if (!re.test(page.cur)) throw new Error(`Missing BUILD:${name} markers in ${file}`);
  // Use a function as the replacer. Generated content has prices like "$1.80",
  // and in a replacement string `$1` gets read as a capture group.
  page.cur = page.cur.replace(re, (_match, open, close) => `${open}\n${html.trimEnd()}\n${close}`);
}
function flushPages() {
  for (const [file, page] of pages) {
    if (page.cur === page.orig) continue;
    writeFileSync(path.join(ROOT, file), page.cur);
    touched++;
    console.log(`  updated ${file}`);
  }
}

// JSON-LD goes inside a <script> tag, so escape "<". Otherwise a data value
// containing "</script>" could close the tag early and inject markup.
const jsonLd = (obj) => JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');

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
 * 1. Locations index: outlet cards
 * ------------------------------------------------------------------ */
const locCards = outlets.map((o, i) => {
  const num = String(i + 1).padStart(2, '0');
  const hoursAttr = o.hours.open && o.hours.close ? ` data-hours="${o.hours.open}-${o.hours.close}"` : '';
  const brandStyle = o.brand !== 'Berempah Bros' ? ' style="border-color:var(--pandan)"' : '';
  const numStyle = o.brand !== 'Berempah Bros' ? ' style="background:var(--pandan);color:#fff"' : '';
  return `        <article class="loc-card reveal"${hoursAttr}${brandStyle}>
          <span class="loc-num"${numStyle}>NO. ${num} — ${esc(String(o.badge).toUpperCase())}</span>
          <h3><a href="${o.slug}/" style="text-decoration:none">${esc(o.name)}</a></h3>
          <p class="loc-line">${icon.pin} ${esc(o.address)}, S(${o.postal})</p>
          <p class="loc-line">${icon.clock} ${esc(o.hours.display)}</p>
          ${o.transport ? `<p class="loc-line">${icon.train} ${esc(o.transport)}</p>` : ''}
          ${o.phone ? `<p class="loc-line">${icon.phone} <a href="tel:${o.phone.replace(/\s/g, '')}" data-track="call" data-outlet="${o.slug}">${esc(o.phone)}</a></p>` : ''}
          ${o.note ? `<p class="loc-line">${icon.spice} ${esc(o.note)}</p>` : ''}
          <span class="loc-chip"><a href="${o.slug}/" style="text-decoration:none">Outlet page →</a></span>
          <span class="loc-chip"><a href="${esc(mapsUrl(o))}" target="_blank" rel="noopener" style="text-decoration:none" data-track="directions" data-outlet="${o.slug}">Directions ↗</a></span>
          <span class="loc-chip"><a href="${esc(site.orderUrl)}" target="_blank" rel="noopener" style="text-decoration:none" data-track="order" data-outlet="${o.slug}">Order ↗</a></span>
        </article>`;
}).join('\n');
const comingCards = comingSoon.map((c, i) => {
  const num = String(outlets.length + i + 1).padStart(2, '0');
  return `        <article class="loc-card reveal" style="border-style:dashed">
          <span class="loc-num" style="background:var(--turmeric);color:var(--ink)">NO. ${num} — ${esc(String(c.badge || 'Coming Soon').toUpperCase())}</span>
          <h3>${esc(c.name || 'Coming Soon')}</h3>
          ${c.note ? `<p class="loc-line">${icon.spice} ${esc(c.note)}</p>` : ''}
          <span class="loc-chip"><a href="${esc(site.instagram)}" target="_blank" rel="noopener" style="text-decoration:none">Watch on Instagram ↗</a></span>
        </article>`;
}).join('\n');
region('locations/index.html', 'outlets', [locCards, comingCards].filter(Boolean).join('\n'));

/* ------------------------------------------------------------------ *
 * 2. Menu page: cards, sides, builder, note
 * ------------------------------------------------------------------ */
// hidden items are left off the site entirely (kept in the data so they can
// come back). soldOut items still show, marked sold out, and can't be picked
// in the order builder.
const visible = (i) => !i.hidden;
const mains = menu.sections.flatMap((s) => s.items).filter((i) => i.slug !== 'feast2' && visible(i));
// Optional fields get defaults so an item edited in the dashboard (which
// doesn't show image or tags) still builds. Image falls back to the slug.
// If an item has neither, throw instead of writing out a broken img.
const menuCards = mains.map((it) => {
  const image = it.image || it.slug;
  if (!image) throw new Error(`menu item ${it.name || '(unnamed)'}: needs an image or a slug`);
  const tags = Array.isArray(it.tags) ? it.tags : [];
  return `        <article class="chit reveal${it.soldOut ? ' sold-out' : ''}">
          <div class="chit-photo">
            <img src="../assets/${image}.webp" srcset="../assets/sm/${image}.webp 800w, ../assets/${image}.webp 1149w" sizes="(max-width: 720px) 92vw, (max-width: 1024px) 46vw, 420px" alt="${esc(it.name)} — ${esc(it.desc)}" loading="lazy">
            <span class="chit-price">${it.soldOut ? 'Sold out' : `$${it.price}`}</span>
          </div>
          <div class="chit-body">
            <h3>${esc(it.name)}</h3>
            <p>${esc(it.desc)}</p>
            <div class="tag-row">${tags.map((t) => `<span class="tag${/best/i.test(t) ? ' best' : /spicy/i.test(t) ? ' hot' : ''}">${esc(t)}</span>`).join('')}</div>
          </div>
        </article>`;
}).join('\n');
region('menu/index.html', 'menu-cards', menuCards);

const sidesRow = `        <h3>Sides</h3>\n` + menu.sides.filter(visible).map((s) => `        <span class="addon${s.soldOut ? ' sold-out' : ''}">${esc(s.name)} <b>${s.soldOut ? 'sold out' : `$${s.price}`}</b></span>`).join('\n');
region('menu/index.html', 'sides', sidesRow);

// The first item that isn't sold out starts selected.
const firstAvailable = mains.findIndex((it) => !it.soldOut);
const builderProteins = mains
  .map((it, i) => `              <label class="chip"><input type="radio" name="protein" value="${it.price}" data-slug="${it.slug || ''}" data-name="${esc(it.name)}"${i === firstAvailable ? ' checked' : ''}${it.soldOut ? ' disabled' : ''}><span>${esc(it.name.replace(' Berempah', ''))} ${it.soldOut ? '(sold out)' : `$${it.price}`}</span></label>`).join('\n');
region('menu/index.html', 'builder-proteins', builderProteins);

const builderCuts = menu.chickenParts.map((c, i) =>
  `              <label class="chip"><input type="radio" name="cut" value="${c}"${i === 0 ? ' checked' : ''}><span>${c}</span></label>`).join('\n');
region('menu/index.html', 'builder-cuts', builderCuts);

const builderAddons = menu.setAddOns.filter(visible).map((a) =>
  `              <label class="chip"><input type="checkbox" name="addon" value="${a.price}" data-name="${esc(a.name)}"${a.soldOut ? ' disabled' : ''}><span>${esc(a.name.replace(' Berempah', ''))} ${a.soldOut ? '(sold out)' : `+$${a.price}`}</span></label>`).join('\n');
region('menu/index.html', 'builder-addons', builderAddons);

region('menu/index.html', 'menu-note', `      <p class="menu-note">${menu.note}</p>`);

/* ------------------------------------------------------------------ *
 * 3. Promo block (menu page)
 * ------------------------------------------------------------------ */
// data-ends is the one promo detail the browser still needs, i.e. when to stop
// showing it. Everything visible is rendered here, so there's no second copy
// of the promo in the page that could get out of sync.
const promoHtml = promo.active ? `      <div class="lto-chit reveal" data-ends="${esc(promo.endsISO ?? '')}">
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
          <a class="btn btn-gold lto-cta" href="${esc(promo.url)}" target="_blank" rel="noopener" data-track="promo" data-promo="${esc(promo.code)}">
            <span class="lto-cta-txt">${esc(promo.cta)}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>
      </div>` : '      <!-- promo inactive -->';
region('menu/index.html', 'promo', promoHtml);


/* Catering offer line. It only comes from data.catering. The offer is stored
   as plain text and escaped here like any other data value. The tel: link is
   built from the displayed number, so changing the phone in the dashboard
   also changes the number the link dials. */
const cateringTel = (() => {
  const digits = String(site.cateringPhone || '').replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : '+65' + digits;
})();
region('menu/index.html', 'catering',
  `        <b style="color:var(--paper)">${esc(catering.offer)}</b><br>Call <a href="tel:${cateringTel}" style="color:#F2BE8E;font-weight:700">${esc(site.cateringPhone)}</a> for catering enquiries, or DM us on Instagram with your date, headcount and venue.`);

/* Catering form outlet dropdown */
region('contact/index.html', 'catering-outlets',
  ['                <option>No preference</option>',
    ...outlets.map((o) => `                <option value="${esc(o.name)}">${esc(o.name)}</option>`)].join('\n'));

/* FormSubmit return URLs. Built from baseUrl, so if the domain changes the
   thank-you redirect (and its confirmation event) won't keep pointing at the
   old host. */
region('contact/index.html', 'next-contact',
  `          <input type="hidden" name="_next" value="${esc(base)}/contact/?sent=1">`);
region('contact/index.html', 'next-catering',
  `          <input type="hidden" name="_next" value="${esc(base)}/contact/?catering=1#catering">`);
region('contact/index.html', 'next-club',
  `            <input type="hidden" name="_next" value="${esc(base)}/contact/?joined=1">`);

/* Enquiry email. All the mailto links and form actions use site.email, so
   changing the inbox means editing one field in the data file. (A new inbox
   has to click FormSubmit's activation email once before the forms deliver.) */
const mail = esc(site.email);
region('contact/index.html', 'mail-general',
  `          <a class="btn btn-chili" href="mailto:${mail}?subject=General%20Enquiry">Email Us</a>`);
region('contact/index.html', 'mail-business',
  `          <a class="btn btn-chili" href="mailto:${mail}?subject=Business%20%26%20Collaboration">Email Us</a>`);
region('contact/index.html', 'mail-media',
  `          <a class="btn btn-chili" href="mailto:${mail}?subject=Media%20%26%20Press">Email Us</a>`);
region('contact/index.html', 'form-contact',
  `        <form class="cform" id="contactFormEl" action="https://formsubmit.co/${mail}" method="POST">`);
region('contact/index.html', 'form-catering',
  `        <form class="cform" id="cateringForm" action="https://formsubmit.co/${mail}" method="POST">`);
region('contact/index.html', 'form-club',
  `          <form class="club-form" id="clubForm" action="https://formsubmit.co/${mail}" method="POST" novalidate>`);
region('careers/index.html', 'mail-careers',
  `          <a class="btn btn-chili" href="mailto:${mail}?subject=Job%20Application">Apply Now</a>`);

/* Catering section headline on the menu page (editable in the dashboard) */
region('menu/index.html', 'catering-headline',
  `        <h2 id="catering-title">${esc(catering.headline || 'Feed The Whole Kampung')}</h2>`);

/* ------------------------------------------------------------------ *
 * 4. Home: stats and JSON-LD
 * ------------------------------------------------------------------ */
const totalStalls = outlets.length + comingSoon.length;
// The hero shows this price as the signature ayam set. If the slug goes
// missing, fail here instead of quietly using some other item's price.
const ayam = mains.find((m) => m.slug === 'ayam');
if (!ayam) throw new Error('hero stats: no menu item with slug "ayam" — the signature-set price comes from it');
const brandCount = new Set(outlets.map((o) => o.brand)).size;
region('index.html', 'hero-stats', `        <div><b>16</b>spices in the rempah</div>
        <div><b>${totalStalls}</b>stalls · ${brandCount} brands</div>
        <div><b>$${ayam.price.replace('.00', '')}</b>signature ayam set</div>
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
    name: fullName(o),
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
region('index.html', 'jsonld', `<script type="application/ld+json">\n${jsonLd(restaurantLd)}\n</script>`);

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
        ...menu.sections.filter((s) => s.items.some(visible)).map((s) => ({ '@type': 'MenuSection', name: s.name,
          hasMenuItem: s.items.filter(visible).map((i) => ({ '@type': 'MenuItem', name: i.name,
            ...(i.menuDesc ? { description: i.menuDesc.replace(/&amp;/g, '&') } : {}),
            offers: { '@type': 'Offer', price: i.price, priceCurrency: 'SGD' } })) })),
        { '@type': 'MenuSection', name: 'Sides', hasMenuItem: menu.sides.filter(visible).map((s) => ({
          '@type': 'MenuItem', name: s.name, offers: { '@type': 'Offer', price: s.price, priceCurrency: 'SGD' } })) },
      ] },
  ],
};
region('menu/index.html', 'jsonld', `<script type="application/ld+json">\n${jsonLd(menuLd)}\n</script>`);

/* ------------------------------------------------------------------ *
 * 5b. News page: posts + blog structured data, from data.news
 * ------------------------------------------------------------------ */
// Post text uses a tiny markup the dashboard can explain in one line:
// **bold**, [link text](https://...), and a blank line between paragraphs.
// Everything is escaped first, so no raw HTML gets through from the data.
const safeHref = (u) => /^(https?:\/\/|mailto:|tel:|\/|\.\.\/|#)/i.test(u) ? u : null;
const isExternal = (u) => /^https?:\/\//i.test(u);
const inline = (text) => esc(text)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
    const href = safeHref(url.replace(/&amp;/g, '&'));
    if (!href) return label;
    return `<a href="${esc(href)}"${isExternal(href) ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
  });
const IMG_RE = /^[a-z0-9][a-z0-9/_-]*$/i;
const news = (Array.isArray(data.news) ? data.news : []).filter((p) => !p.hidden);
for (const p of news) {
  if (!SLUG_RE.test(String(p.id || ''))) throw new Error(`news post "${p.title}": id must be lowercase-kebab, e.g. stall-six`);
  if (p.image && !IMG_RE.test(p.image)) throw new Error(`news post "${p.title}": bad image name ${JSON.stringify(p.image)}`);
}
const newsPosts = news.map((p) => {
  const tags = (p.tags || []).map((t) => `<span class="tag${t.style === 'best' || t.style === 'hot' ? ' ' + t.style : ''}">${esc(t.text)}</span>`).join('');
  const paras = String(p.body || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)
    .map((x) => `        <p>${inline(x).replace(/\n/g, '<br>')}</p>`);
  const btns = (p.buttons || []).filter((b) => b.text && safeHref(b.url)).map((b) =>
    `<a class="btn btn-${b.style === 'chili' ? 'chili' : 'paper'}" href="${esc(b.url)}"${isExternal(b.url) ? ' target="_blank" rel="noopener"' : ''}${b.track ? ` data-track="${esc(b.track)}"` : ''}>${esc(b.text)}</a>`);
  return [
    `    <article class="post${p.pinned ? ' pinned' : ''} reveal" id="${p.id}">`,
    `      <span class="post-date">${esc(p.date || '')}</span>`,
    `      <div class="post-head">`,
    `        <div class="post-tags">${tags}</div>`,
    `        <h2>${esc(p.title)}</h2>`,
    `      </div>`,
    p.image ? `      <div class="post-photo"><img src="../assets/${p.image}.webp" alt="${esc(p.imageAlt || p.title)}" loading="lazy"></div>` : null,
    `      <div class="post-body">`,
    ...paras,
    btns.length ? `        <p class="post-cta">${btns.join(' ')}</p>` : null,
    `      </div>`,
    `    </article>`,
  ].filter((l) => l !== null).join('\n');
}).join('\n\n');
region('news/index.html', 'news-posts', newsPosts);

const newsLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
      { '@type': 'ListItem', position: 2, name: 'News', item: `${base}/news/` }] },
    { '@type': 'Blog', name: 'The Berempah Bulletin', inLanguage: 'en-SG',
      blogPost: news.filter((p) => p.dateISO).map((p) => ({
        '@type': 'BlogPosting', headline: p.title, datePublished: p.dateISO, url: `${base}/news/#${p.id}` })) },
  ],
};
region('news/index.html', 'jsonld', `<script type="application/ld+json">\n${jsonLd(newsLd)}\n</script>`);

/* ------------------------------------------------------------------ *
 * 5c. Page copy edited in the dashboard: home hero, story, careers
 * ------------------------------------------------------------------ */
// Same **bold** / [link](url) markup as the news. Body paragraphs keep the
// look they had when hand-written: muted text with dark bold words, and a
// closing line that is all bold printed in full ink.
const pg = data.pages || {};
const copyParas = (text, indent) => {
  const ps = String(text || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  return ps.map((x, i) => {
    const last = i === ps.length - 1;
    if (last && /^\*\*[^*]+\*\*$/.test(x)) return `${indent}<p style="color:var(--ink)">${inline(x)}</p>`;
    return `${indent}<p style="color:var(--ink-70)${last ? '' : ';margin-bottom:14px'}">${inline(x).replace(/<b>/g, '<b style="color:var(--ink)">').replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
};
const lines = (t) => String(t || '').split('\n').map((x) => esc(x.trim())).filter(Boolean).join('<br>');

if (pg.home) {
  region('index.html', 'hero-copy', [
    `      <span class="hand hero-tag">${esc(pg.home.tag || '')}</span>`,
    `      <p style="font-family:var(--font-display);font-size:clamp(1.1rem,2.5vw,1.6rem);letter-spacing:.14em;color:#F0E2C4;text-transform:uppercase">Berempah Bros</p>`,
    `      <h1 id="hero-title">${esc(pg.home.titleLine1 || '')}<span class="line2">${esc(pg.home.titleLine2 || '')}</span></h1>`,
    `      <p style="max-width:38rem;font-size:1.15rem;color:#F0E2C4;margin:18px 0 28px">${esc(pg.home.intro || '')}</p>`,
  ].join('\n'));
}
if (pg.story) {
  region('story/index.html', 'story-copy',
    `        <h2 id="story-full" style="font-size:clamp(2.2rem,5vw,3.6rem);margin:var(--s2) 0 var(--s3)">${lines(pg.story.heading)}</h2>\n` +
    copyParas(pg.story.body, '        '));
}
if (pg.careers) {
  region('careers/index.html', 'careers-intro',
    `        <h2 id="careers-title" style="font-size:clamp(2.2rem,5vw,3.6rem);margin:var(--s2) 0 var(--s3)">${lines(pg.careers.heading)}</h2>\n` +
    copyParas(pg.careers.intro, '        '));
  region('careers/index.html', 'careers-roles', [
    `        <ul class="roles-list">`,
    ...(pg.careers.roles || []).filter(Boolean).map((r) => `          <li>${esc(r)}</li>`),
    `        </ul>`,
    pg.careers.note ? `        <p class="hand" style="font-size:1.5rem;color:var(--chili-deep);margin-top:var(--s3);display:inline-block;transform:rotate(-1.5deg)">${esc(pg.careers.note)}</p>` : null,
  ].filter((l) => l !== null).join('\n'));
}

// All marked regions are rendered now. Write each changed page once.
flushPages();

/* ------------------------------------------------------------------ *
 * 6. Outlet detail pages
 * ------------------------------------------------------------------ */
const shell = readFileSync(path.join(ROOT, 'templates', 'outlet.html'), 'utf8');
const outletsDir = path.join(ROOT, 'locations');
// Clear out dirs from the last build. The .generated marker holds the slug it
// was written for, and we only delete a folder when the marker matches the
// folder name. That way a folder copied by hand from a generated one (with a
// stale marker inside) doesn't get deleted.
for (const d of readdirSync(outletsDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const marker = path.join(outletsDir, d.name, '.generated');
  if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === d.name) {
    rmSync(path.join(outletsDir, d.name), { recursive: true });
  }
}

for (const o of outlets) {
  const dir = path.join(outletsDir, o.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, '.generated'), `${o.slug}\n`);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: fullName(o),
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

  const tokens = {
    TITLE: `${esc(fullName(o))} | Singapore`,
    DESC: `${esc(fullName(o))} — ${esc(o.address)}, Singapore ${o.postal}. ${esc(o.hours.display)}. Directions, hours and islandwide delivery.`,
    SLUG: o.slug,
    BASE: base,
    JSONLD: `${jsonLd(ld)}\n</script>\n<script type="application/ld+json">\n${jsonLd(crumbs)}`,
    BADGE: esc(o.badge),
    BRAND: esc(o.brand),
    NAME: esc(o.name),
    DETAILS: details,
    MAPS: esc(mapsUrl(o)),
    ORDER: esc(site.orderUrl),
    OTHERS: others,
    HOURS_ATTR: o.hours.open && o.hours.close ? ` data-hours="${o.hours.open}-${o.hours.close}"` : '',
  };
  // Token values are literal text, so use a function for the replacement. In a
  // replacement string "$$" turns into "$" and "$&" puts the match back in.
  // The priceRange "$$" in the structured data is a real case of this.
  const html = shell.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : match);
  const leftover = html.match(/\{\{[A-Z_]+\}\}/g);
  if (leftover) throw new Error(`Unresolved template token(s) in ${o.slug}: ${[...new Set(leftover)].join(', ')}`);
  writeFileSync(path.join(dir, 'index.html'), html);
  touched++;
  console.log(`  generated locations/${o.slug}/`);
}

/* ------------------------------------------------------------------ *
 * 7. Sitemap
 * ------------------------------------------------------------------ */
// Don't set lastmod to today's date. The sitemap would then change every day,
// so rebuilding unchanged content would show up as a diff and fail the drift
// check in CI. It's the date the content was last edited, which is also what
// search engines want.
const lastmod = process.env.BUILD_DATE || data.site.contentUpdated;
if (!/^\d{4}-\d{2}-\d{2}$/.test(String(lastmod))) {
  throw new Error('site.contentUpdated must be an ISO date (YYYY-MM-DD) in data/site.json');
}
const urls = ['', 'story/', 'menu/', 'locations/', 'careers/', 'contact/', 'news/', 'privacy/',
  ...outlets.map((o) => `locations/${o.slug}/`)];
writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${base}/${u}</loc><lastmod>${lastmod}</lastmod><changefreq>${u === '' || u === 'news/' ? 'weekly' : 'monthly'}</changefreq></url>`).join('\n') +
  `\n</urlset>\n`);
console.log(`  sitemap.xml (${urls.length} urls)`);

/* ------------------------------------------------------------------ *
 * 8. Absolute URLs: canonical/OG tags, redirect stubs, robots, 404
 * ------------------------------------------------------------------ */
// The hand-written <head> sections have absolute URLs. Rewrite them from
// baseUrl so moving domains (GitHub Pages, then DigitalOcean, then a custom
// domain) only needs one field in data/site.json and a rebuild, instead of
// going through every page by hand.
const setAttrUrl = (src, re, url) => src.replace(re, (_m, pre, post) => `${pre}${url}${post}`);
let urlTouched = 0;
for (const u of urls) {
  const file = u === '' ? 'index.html' : `${u}index.html`;
  const p = path.join(ROOT, file);
  const src = readFileSync(p, 'utf8');
  const pageUrl = `${base}/${u}`;
  const ogImg = `${base}/assets/og-image.jpg`;
  let out = src;
  out = setAttrUrl(out, /(<link rel="canonical" href=")[^"]*(")/, pageUrl);
  out = setAttrUrl(out, /(<meta property="og:url" content=")[^"]*(")/, pageUrl);
  out = setAttrUrl(out, /(<meta property="og:image" content=")[^"]*(")/, ogImg);
  out = setAttrUrl(out, /(<meta name="twitter:image" content=")[^"]*(")/, ogImg);
  // Top-level pages have hand-written breadcrumb JSON-LD. The first item is
  // home and the rest point at the page itself. Outlet pages get regenerated
  // from the template on every build, so skip them here.
  if (u.split('/').filter(Boolean).length <= 1) {
    let itemIdx = 0;
    out = out.replace(/("item": ")[^"]*(")/g, (_m, pre, post) => `${pre}${itemIdx++ === 0 ? `${base}/` : pageUrl}${post}`);
    // JSON-LD urls with a #fragment (the blog posts on the news page) point
    // back at the same page. Keep the fragment and replace the origin.
    out = out.replace(/("url": ")[^"#]*(#[^"]*")/g, (_m, pre, frag) => `${pre}${pageUrl}${frag}`);
  }
  if (out !== src) { writeFileSync(p, out); urlTouched++; }
}
for (const stub of ['story', 'menu', 'locations', 'careers', 'contact', 'news']) {
  const p = path.join(ROOT, `${stub}.html`);
  if (!existsSync(p)) continue;
  const src = readFileSync(p, 'utf8');
  const out = setAttrUrl(src, /(<link rel="canonical" href=")[^"]*(")/, `${base}/${stub}/`);
  if (out !== src) { writeFileSync(p, out); urlTouched++; }
}
{
  const p = path.join(ROOT, 'robots.txt');
  const src = readFileSync(p, 'utf8');
  const out = src.replace(/^Sitemap: .*$/m, `Sitemap: ${base}/sitemap.xml`);
  if (out !== src) { writeFileSync(p, out); urlTouched++; }
}
if (urlTouched) console.log(`  refreshed absolute urls in ${urlTouched} files`);

// 404 page, served for any missing path (GitHub Pages and DigitalOcean both
// look for 404.html at the root). It can show up at any depth, so the links
// have to be absolute, which is why it's generated here from baseUrl. Styles
// are inline because a 404 shouldn't rely on an asset that may be the missing file.
writeFileSync(path.join(ROOT, '404.html'), `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Page not found — ${esc(site.name)}</title>
<style>
  body{margin:0;font-family:'Karla',system-ui,sans-serif;background:#F5EBD8;color:#281414;display:grid;min-height:100vh;place-items:center;text-align:center;padding:24px}
  .box{max-width:26rem}
  h1{font-size:3rem;margin:0 0 8px;text-transform:uppercase}
  h1 em{font-style:normal;color:#A64809}
  p{color:#543C34;line-height:1.5;margin:0 0 20px}
  a.btn{display:inline-block;background:#F2701D;color:#281414;font-weight:700;text-decoration:none;border:2px solid #281414;border-radius:4px;padding:12px 22px;margin:4px}
  a.plain{color:#A64809}
</style>
</head>
<body>
<div class="box">
  <h1>Wah, <em>lost lah</em></h1>
  <p>This page doesn't exist (or the stall moved). The good stuff is still here:</p>
  <p>
    <a class="btn" href="${base}/">Home</a>
    <a class="btn" href="${base}/menu/">Menu</a>
    <a class="btn" href="${base}/locations/">Find a stall</a>
  </p>
</div>
</body>
</html>
`);
console.log('  404.html');

/* ------------------------------------------------------------------ *
 * 9. Analytics config (shared by every page)
 * ------------------------------------------------------------------ */
// The ID gets written into a quoted JS string. If it isn't a plain GA4 id,
// throw here, otherwise we'd write a syntax error that breaks every page's script.
const ga4Id = site.analytics.ga4MeasurementId;
if (ga4Id && !/^G-[A-Z0-9]+$/i.test(ga4Id)) {
  throw new Error(`site.analytics.ga4MeasurementId ${JSON.stringify(ga4Id)} does not look like a GA4 id (G-XXXXXXXXXX)`);
}
writeFileSync(path.join(ROOT, 'assets', 'analytics-config.js'),
  `/* generated by build.mjs from data/site.json */\nwindow.BB_GA4_ID = ${ga4Id ? `'${ga4Id}'` : 'null'};\n`);
console.log('  assets/analytics-config.js');

/* ------------------------------------------------------------------ *
 * 10. Dashboard page module for the Vercel middleware
 * ------------------------------------------------------------------ */
// middleware.js serves the dashboard at a secret address behind a login, and
// imports the page from this module (a plain import gets bundled with it).
// admin/index.html stays the file to edit.
{
  const src = readFileSync(path.join(ROOT, 'admin', 'index.html'), 'utf8');
  const out = `/* generated by build.mjs from admin/index.html, do not edit */\nexport default ${JSON.stringify(src)};\n`;
  const p = path.join(ROOT, 'admin', 'page.mjs');
  if (!existsSync(p) || readFileSync(p, 'utf8') !== out) { writeFileSync(p, out); touched++; }
  console.log('  admin/page.mjs');
}

console.log(`\nBuild complete — ${touched} files written, ${outlets.length} outlets published.`);
