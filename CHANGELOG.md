# Progress log

What has been built, what is deliberately not built yet, and what is waiting on
the brand. Newest first. For *how* to work on the project see
[README.md](README.md); for the forward plan see [docs/roadmap.md](docs/roadmap.md).

---

## Phase 3 — Engineering foundations (current)

Turning a hand-authored site into something maintainable by someone else.

### Done

**Single source of truth.** Every price, outlet, promo and catering term now
lives in `data/site.json`. `build.mjs` renders it into marked regions of the
HTML, so the same fact cannot drift between the home page, the menu page and
the structured data. Editing a price is one line in one file.

**Per-outlet pages with local SEO.** `locations/<slug>/` is generated for each
published outlet from `templates/outlet.html`: its own title, description,
canonical URL, breadcrumb and `FoodEstablishment` structured data with verified
coordinates and opening hours. Adding an outlet means adding a JSON object;
the page, the sitemap entry, the locations grid and the JSON-LD follow.

**Conversion tracking.** Order clicks, directions, phone taps, promo clicks,
catering enquiries and Crunch Club signups fire GA4 events via `data-track`
attributes, so no page needs bespoke analytics code. Measurement ID lives in
the data file; with no ID configured nothing loads and no cookies are set.

**Test suite and CI.** `npm test` runs data-integrity checks (postcode format,
price format, coordinates inside Singapore, slug shape, duplicate detection)
then audits every page in a real browser: broken images, dead links, missing
alt text, duplicate IDs, invalid JSON-LD, layout overflow at three widths and
script errors. GitHub Actions runs it on every push and pull request.

**Documentation.** `README.md` (orientation), `CLAUDE.md` (conventions for AI
agents), `docs/` (task guides), `.claude/skills/` (runnable workflows for
adding an outlet, updating the menu, shipping changes).

### Defects found and fixed while testing

These are recorded because they are the kind of thing a generated site ships
with silently.

| Defect | How it was found | Fix |
|---|---|---|
| Generated content containing `$1`/`$&` was corrupted when inserted (prices!) | Building with real price data | Replacement uses a function, not a string |
| A slug like `../../elsewhere` wrote pages **outside the project** | Feeding the build hostile data | Slugs validated; duplicates rejected |
| `&` in an outlet badge became the invalid entity `&AMP;` | Hostile-content test | Uppercase before escaping, not after |
| Build output differed every calendar day, so CI would fail on any later day | Comparing a clean-clone build | `lastmod` comes from `site.contentUpdated` |
| A clean checkout plus a build looked like a change (CRLF vs LF) | Building from a fresh clone | `.gitattributes` normalises to LF |
| Audit failed at random when a font request hiccuped | Re-running the suite repeatedly | Third-party network noise no longer fails CI |

### Not done yet (deliberate)

- **Loyalty, customer accounts, direct ordering** — need a backend and a
  payment/POS decision; ordering currently goes to Oddle, which the brand
  already runs. See the roadmap for sequencing and rough effort.
- **PWA / push notifications** — was built, then removed at the brand's
  request. Recoverable from git history if wanted (`git log --all --grep=PWA`).
- **CRM** — signups reach the brand inbox through the form pipeline. Moving to
  Mailchimp/MailerLite is a form-action swap once an account exists.
- **Outlet-specific promotions** — the data model supports a `promo` object;
  per-outlet overrides are a small extension, not yet needed with five outlets.

---

## Phase 2 — Content accuracy and brand fit

**Everything on the site is verified against a primary source.** Prices and
item names come from the brand's own ordering store, not from press articles —
a check that found the published menu offers only thigh and breast, while
reviews still mention wings. Coordinates come from OneMap, Singapore's official
geocoder, by postal code. Catering terms come from the brand's bulk-order
poster artwork. Press quotes are verbatim from the linked article.

**Brand assets replaced improvised ones.** The brand's own food photography and
mascot replaced generated placeholder imagery; the official colour system
(orange gradient, batik brick red) and the Meaty Bliss display face from the
brand's artwork package replaced the interim palette and typeface.

**Structure follows the brand's own copy document** — home sections, wording
and navigation match it; a copy-fidelity check confirmed no paraphrasing crept
in during later edits.

---

## Phase 1 — Site foundations

Multi-page static site: home, story, menu, locations, careers, contact, news.
Clean URLs (`/menu/`, not `/menu.html`) with redirects from the old paths.
Responsive down to 375px, works with JavaScript disabled, keyboard accessible,
WCAG-checked contrast. Security headers (CSP, referrer policy, frame-busting),
Open Graph and Twitter cards, sitemap and robots.

---

## Waiting on the brand

1. **Outlet No. 06** — address and hours; add to `data/site.json` and rebuild.
2. **Catering tray concepts** — confirm contents with the kitchen (the Feast
   For 2 platter and the 15%-off bulk term are verified; the three tray
   concepts are illustrative).
3. **TikTok / Facebook** — no official accounts found; footer links stay
   commented out until they exist.
4. **Instagram gallery** — three tiles link to real posts, three to the
   profile; real post URLs welcome.
5. **Font licence** — Meaty Bliss (TimelessType.co) came from the brand's print
   artwork package; confirm the licence covers web embedding.
6. **GA4 measurement ID** — analytics stays dormant until one is added.
7. **Form activation** — one click on the FormSubmit activation email enables
   both the contact form and Crunch Club signups.
