# Berempah Bros — Website

Brand website for [Berempah Bros](https://www.instagram.com/berempahbros/): signature ayam berempah by MasterChef Singapore Season 2 winner Derek Cheong, across Berempah Bros and sister brand Gepuk Guys.

**Live:** https://www.berempahbros.com/

Static site, no framework, no runtime dependencies. Content lives in one JSON file; a small Node build renders it into the pages.

---

## Quick start

```bash
npm install          # dev dependencies (Playwright, for tests only)
npm run build        # render pages from data/site.json
npm test             # data checks + full page audit (needs Chromium)
npm run dev          # serve locally at http://localhost:5000
```

Nothing is required to *view* the site: the HTML is committed and works from any static host.

---

## How the project is organised

```
data/site.json          ← SINGLE SOURCE OF TRUTH: outlets, menu, prices, promo
build.mjs               ← renders JSON into the pages; generates outlet pages
templates/outlet.html   ← shell for every per-outlet page
test.mjs                ← data integrity + page audits (npm test)
audit.mjs               ← one-page audit used by tests and ad-hoc

index.html              ← home
story/  menu/  locations/  careers/  contact/  news/   ← inner pages
locations/<slug>/       ← GENERATED per-outlet pages (never hand-edit)
assets/                 ← css, brand photography, fonts, analytics
*.html (root)           ← legacy redirect stubs from the pre-clean-URL era
```

### The build contract

Regions inside the HTML that come from data are wrapped in markers:

```html
<!-- BUILD:menu-cards -->
   …generated, will be overwritten…
<!-- /BUILD:menu-cards -->
```

`build.mjs` only ever replaces what is *between* markers. Everything else (the
brand copy, layout, design) is hand-authored and safe to edit directly.

**Rule of thumb:** prices, outlet details and promos → edit `data/site.json`.
Words, layout, styling → edit the HTML/CSS.

---

## Common tasks

Detailed step-by-step guides live in [`docs/`](docs/):

| Task | Guide |
|------|-------|
| Add or update an outlet | [docs/add-outlet.md](docs/add-outlet.md) |
| Privacy notice (PDPA) | privacy/index.html (static content page) |
| Change menu items or prices | [docs/update-menu.md](docs/update-menu.md) |
| Start / stop / change a promotion | [docs/update-promo.md](docs/update-promo.md) |
| Run the checks | [docs/testing.md](docs/testing.md) |
| Old GitHub Pages / DigitalOcean notes (retired) | [docs/deploy.md](docs/deploy.md) |
| **Hand the site to a new owner** (GitHub, Vercel, push, domain) | [docs/handover.md](docs/handover.md) |

---

## Data accuracy policy

Menu prices, outlet addresses and promotions on this site are **verified against
primary sources**, not copied from press articles:

- Prices and item names: the brand's own ordering store (berempahbros.oddle.me)
- Coordinates: OneMap (Singapore's official geocoder), by postal code
- Catering terms: the brand's official bulk-order poster artwork
- Press quotes: quoted verbatim from the linked article

`data/site.json` carries `_source` notes and a last-verified date. When editing,
re-verify rather than trusting the file; third-party menus change silently.
`npm test` enforces *format* (valid postcodes, prices, coordinates inside
Singapore); it cannot tell you a price is out of date.

---

## Deployment

The live site is **www.berempahbros.com**, hosted on Vercel (team `wetrade1`,
project `berempah-bro`). Vercel runs `node build.mjs` on every push and
serves the repo root (`vercel.json`). `middleware.js` adds the dashboard
login, push notifications and the Insights counter.

Vercel deploys from a private mirror, `effortxd/berempah-bros-site`. The
client's repo is `foxdrop001/berempah-bro`. One `git push origin main` sends
to both. Dashboard saves go to the mirror, so to bring the client's repo up
to date run:

```bash
git sync
```

Run `npm test` before pushing. Settings that must stay secret (dashboard
address and login, push keys, database) live in Vercel's environment
variables, never in the repo. The full picture, and how to hand hosting to
the client later, is in [docs/handover.md](docs/handover.md).

---

## Project status

[CHANGELOG.md](CHANGELOG.md) records what has been built, the defects found
while testing and how they were fixed, and what is deliberately left for later.

### Still to confirm with the brand

Search the HTML for `PLACEHOLDER`:

1. **Outlet No. 06**: the newest stall's address (add it to `data/site.json`)
2. **Catering tray concepts** on the menu page: confirm contents with the kitchen
3. **TikTok / Facebook**: no official accounts exist yet; footer links are commented out
4. **Instagram gallery**: three tiles link to real posts; three link to the profile
5. **Font licence**: Meaty Bliss (TimelessType.co) is self-hosted from the brand's
   artwork package; confirm the licence covers web embedding
6. **GA4 measurement ID**: analytics stays dormant until one is set in `data/site.json`
7. **Form activation**: one click on the FormSubmit activation email enables the
   contact form and Crunch Club signups
