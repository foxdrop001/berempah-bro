# Berempah Bros — Website

Brand website for [Berempah Bros](https://www.instagram.com/berempahbros/): signature ayam berempah by MasterChef Singapore Season 2 winner Derek Cheong, across Berempah Bros and sister brand Gepuk Guys.

**Live:** https://effortxd.github.io/berempah-bro/

Static site, no framework, no runtime dependencies. Content lives in one JSON file; a small Node build renders it into the pages.

---

## Quick start

```bash
npm install          # dev dependencies (Playwright, for tests only)
npm run build        # render pages from data/site.json
npm test             # data checks + full page audit (needs Chromium)
npm run dev          # serve locally at http://localhost:5000
```

Nothing is required to *view* the site — the HTML is committed and works from any static host.

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

`build.mjs` only ever replaces what is *between* markers. Everything else — the
brand copy, layout, design — is hand-authored and safe to edit directly.

**Rule of thumb:** prices, outlet details and promos → edit `data/site.json`.
Words, layout, styling → edit the HTML/CSS.

---

## Common tasks

Detailed step-by-step guides live in [`docs/`](docs/):

| Task | Guide |
|------|-------|
| Add or update an outlet | [docs/add-outlet.md](docs/add-outlet.md) |
| Privacy notice (PDPA) | privacy/index.html — static content page |
| Change menu items or prices | [docs/update-menu.md](docs/update-menu.md) |
| Start / stop / change a promotion | [docs/update-promo.md](docs/update-promo.md) |
| Run the checks | [docs/testing.md](docs/testing.md) |
| Deploy, and move to a custom domain | [docs/deploy.md](docs/deploy.md) |

---

## Data accuracy policy

Menu prices, outlet addresses and promotions on this site are **verified against
primary sources**, not copied from press articles:

- Prices and item names: the brand's own ordering store (berempahbros.oddle.me)
- Coordinates: OneMap (Singapore's official geocoder), by postal code
- Catering terms: the brand's official bulk-order poster artwork
- Press quotes: quoted verbatim from the linked article

`data/site.json` carries `_source` notes and a last-verified date. When editing,
re-verify rather than trusting the file — third-party menus change silently.
`npm test` enforces *format* (valid postcodes, prices, coordinates inside
Singapore); it cannot tell you a price is out of date.

---

## Deployment

The live site serves from the `gh-pages` branch; `main` holds the source.
Publishing means getting a built `main` onto `gh-pages`.

**Two workflows are written but not yet switched on** (GitHub only runs
workflows from `.github/workflows/`, and adding a file there needs a token
with `workflow` scope, which the deploy credential deliberately does not
have). One person with repo access enables each once — on GitHub →
**Actions** → *set up a workflow yourself*, then:

1. **`publish.yml`** — paste [`docs/publish-workflow.yml`](docs/publish-workflow.yml).
   From then on, every dashboard save (or any push to `main`) rebuilds the
   pages and publishes them automatically in about a minute. This makes
   `/admin/` Save &amp; Publish the entire flow — no developer step.
2. **`ci.yml`** — paste [`docs/ci-workflow.yml`](docs/ci-workflow.yml).
   Every push and pull request then runs the build, fails on uncommitted
   generated output, and runs the full page audit.

Until the publish workflow is on, deploy by hand: `npm run build`, commit,
then `git push origin main main:gh-pages`. Until CI is on, run `npm test`
locally before pushing.

**Moving to DigitalOcean:** the app spec lives at [`.do/app.yaml`](.do/app.yaml)
(App Platform rebuilds and deploys on every push, so no workflow setup is
needed there). The step-by-step move, including the custom domain and the
one-field `baseUrl` switch, is in
[docs/migrate-digitalocean.md](docs/migrate-digitalocean.md).

See [docs/deploy.md](docs/deploy.md) for the DigitalOcean App Platform path and
the custom-domain migration checklist.

---

## Project status

[CHANGELOG.md](CHANGELOG.md) records what has been built, the defects found
while testing and how they were fixed, and what is deliberately left for later.
[docs/roadmap.md](docs/roadmap.md) covers the forward plan (loyalty, accounts,
direct ordering, CRM) with effort and business value.

### Still to confirm with the brand

Search the HTML for `PLACEHOLDER`:

1. **Outlet No. 06** — the newest stall's address (add it to `data/site.json`)
2. **Catering tray concepts** on the menu page — confirm contents with the kitchen
3. **TikTok / Facebook** — no official accounts exist yet; footer links are commented out
4. **Instagram gallery** — three tiles link to real posts; three link to the profile
5. **Font licence** — Meaty Bliss (TimelessType.co) is self-hosted from the brand's
   artwork package; confirm the licence covers web embedding
6. **GA4 measurement ID** — analytics stays dormant until one is set in `data/site.json`
7. **Form activation** — one click on the FormSubmit activation email enables the
   contact form and Crunch Club signups
