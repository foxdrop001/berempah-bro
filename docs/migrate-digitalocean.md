# Moving the site to DigitalOcean

> **Retired.** The site now runs on Vercel. GitHub Pages and DigitalOcean are no longer used; see [handover.md](handover.md) for the current setup.

The site is built so a hosting move is one data-file edit plus DNS. Everything
that carries an absolute URL (canonical tags, social-share tags, sitemap,
robots.txt, form return addresses, the 404 page, the old .html redirect stubs)
is rewritten by the build from one field: `site.baseUrl` in `data/site.json`.

## Before you start

- A DigitalOcean account. Per the handover plan, create it under a brand-owned
  email, not a personal one.
- The custom domain, registered in the brand's name.
- Repo access (the app deploys straight from GitHub).

## Steps

1. **Create the app.** DigitalOcean → Apps → Create App → connect GitHub →
   pick `effortxd/berempah-bro`, branch `main`. It reads `.do/app.yaml`:
   a static site, built with `node build.mjs`, deployed on every push.
   Region is Singapore.
2. **Check the preview URL.** The app gets an `*.ondigitalocean.app` address.
   Click through it; everything except absolute URLs (still pointing at the
   old address) should already work.
3. **Add the custom domain.** App → Settings → Domains → add the domain,
   set the DNS records it asks for at the registrar. SSL is automatic.
4. **Point the site at its new address.** In `data/site.json` set
   `site.baseUrl` to `https://<the-domain>` (no trailing slash), run
   `npm run build`, check the diff (canonicals, og:url, sitemap, robots,
   redirect stubs, 404 links and form `_next` URLs all change), run
   `npm test`, commit and push. App Platform redeploys itself.
5. **Re-activate the forms.** FormSubmit activation is per email *and*
   domain, so the forms need a one-time confirmation from the new address:
   submit a test through each of the three forms (contact, catering,
   Crunch Club), click the activation link that lands in the enquiries
   inbox, then submit again and check the thank-you page comes back.
   Skipping this silently holds real enquiries at FormSubmit.
6. **Regenerate the QR codes.** `assets/qr-site.png` and the print poster
   encode the full URL as pixels — a rebuild does not change them. Recreate
   them for the new domain (commands in docs/deploy.md) before any print
   run, and keep the old GitHub Pages site up and redirecting for as long
   as already-printed posters are at the stalls.
7. **Retire GitHub Pages slowly.** Leave it up for a few weeks so old links
   and printed QR codes keep working, then replace it with a redirect page
   to the new domain rather than deleting it outright.
8. **Tell Google.** Search Console → add the new domain property → submit
   `https://<the-domain>/sitemap.xml`. If the old property used the
   github.io address, use the Change of Address tool.

## What does not change

- **Editing.** The dashboard still saves to GitHub; App Platform sees the
  push and redeploys with a fresh build. Save-to-live becomes automatic
  without any GitHub Actions setup.
- **Forms.** FormSubmit is independent of hosting. The thank-you return
  URLs rebuild from `baseUrl` automatically.
- **Analytics.** GA4 is domain-agnostic; keep the same Measurement ID.

## Later: WordPress

The production CMS build replaces this static site; at that point the
droplet/managed WordPress gets the domain and this app is deleted. The
content model (outlets, menu, promos, catering) maps across as fields.
