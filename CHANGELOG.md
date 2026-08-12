# Progress log

Where the project stands. Newest first.

---

## Now — engineering foundations

Goal: make the site maintainable by someone other than whoever built it.

**Done**

- **One source of truth.** All prices, outlets, promos and catering terms live in `data/site.json`. The build renders them into the pages, so nothing can drift between the menu page, the home page and the search-engine data.
- **A page per outlet.** Each outlet gets its own page, map link, hours and local-SEO data, generated from the data file. Adding an outlet is one JSON entry.
- **Conversion tracking.** Order clicks, directions, calls, promo clicks, catering enquiries and signups are tracked in GA4. Dormant until a measurement ID is added.
- **Automated checks.** `npm test` verifies the data, then loads every page in a real browser to catch broken images, dead links, accessibility problems and layout breaks. Runs automatically on every push.
- **Docs for humans and AI.** README, `CLAUDE.md`, task guides in `docs/`, and runnable workflows in `.claude/skills/` for adding outlets, updating the menu and shipping changes.

**Deliberately not built yet** — see [docs/roadmap.md](docs/roadmap.md)

- Loyalty, customer accounts and direct ordering — need a backend and a POS/payment decision; ordering runs through Oddle today.
- PWA and push notifications — built, then dropped as not worth the complexity yet.
- CRM — signups reach the brand inbox; moving to Mailchimp is a small swap once an account exists.

---

## Before that — content accuracy

Every fact on the site is checked against a primary source, not copied from articles:

- Prices and dish names from the brand's own ordering store — which is how we caught that the real menu offers thigh and breast only, while reviews still mention wings.
- Coordinates from OneMap, Singapore's official geocoder.
- Catering terms from the official bulk-order poster.
- Press quotes verbatim from the linked article.

Brand photography, the official colour system and the Meaty Bliss typeface replaced the interim placeholders. Page structure and wording follow the brand copy document.

---

## Before that — the site itself

Home, story, menu, locations, careers, contact and news. Clean URLs, responsive to 375px, works without JavaScript, keyboard accessible, security headers, social cards, sitemap.

---

## Waiting on the brand

1. **Outlet No. 06** — address and hours.
2. **Catering trays** — confirm the three tray concepts with the kitchen.
3. **TikTok / Facebook** — no accounts yet; footer links stay off.
4. **Instagram gallery** — three tiles link to real posts, three to the profile.
5. **Font licence** — confirm Meaty Bliss covers web use.
6. **GA4 ID** — analytics stays off until one is added.
7. **Form activation** — one click on the FormSubmit email switches on the contact form and signups.
