# Deployment

## Today

Push to `main` → CI builds and audits → GitHub Pages serves it.

```bash
npm run build && npm test
git commit -am "…"
git push origin main main:gh-pages
```

Live at <https://effortxd.github.io/berempah-bro/>. Pages caches for ~10 minutes;
append `?cb=$(date +%s)` when verifying immediately after a push.

## Content-only changes

Non-technical edits go through the dashboard at `/admin/` — it commits
`data/site.json` directly to GitHub and the same CI pipeline publishes it. No
local setup required.

## Moving to DigitalOcean App Platform

The repo carries `.do/app.yaml` (static site, Singapore region).

1. cloud.digitalocean.com → **Create → App Platform**
2. Connect GitHub → pick `effortxd/berempah-bro`, branch `main`
3. Starter (free static) plan → Create App
4. Every push to `main` auto-deploys

DigitalOcean can set real HTTP headers, which GitHub Pages cannot. After moving,
promote the `<meta>` CSP to response headers and add HSTS.

## Custom domain checklist

When the domain is ready, run this exact sequence — item 3 is the one that breaks
silently if missed.

1. Search-replace `https://effortxd.github.io/berempah-bro` → `https://<domain>` in:
   - `data/site.json` → `site.baseUrl` (this drives canonicals, og:url, sitemap, structured data on rebuild)
   - the 7 page heads: `og:url`, `og:image`, `twitter:image`, `canonical`
   - the redirect stubs at the repo root
   - `robots.txt`
   - `admin/index.html` → `REPO` block only if the repo itself moves
2. `npm run build` — regenerates sitemap, outlet pages and JSON-LD from `baseUrl`
3. **Form redirect URLs** in `contact/index.html` — three `_next` fields
   (`?sent=1`, `?joined=1`, `?catering=1`). If these still point at the old host,
   forms keep working but visitors get bounced to the wrong domain after submitting.
4. **Regenerate the QR codes** — `assets/qr-site.png` and `qr-poster.png` encode
   the URL and cannot be search-replaced:
   ```bash
   python -c "import qrcode; q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=20, border=2); q.add_data('https://<domain>/'); q.make(fit=True); q.make_image(fill_color='#281414', back_color='#F5EBD8').save('assets/qr-site.png')"
   node -e "const{chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1754},deviceScaleFactor:2});await p.goto('file://'+process.cwd()+'/qr-poster.html',{waitUntil:'networkidle'});await p.screenshot({path:'qr-poster.png'});await b.close()})()"
   ```
5. Point DNS: GitHub Pages → repo Settings → Pages → custom domain (writes `CNAME`);
   DigitalOcean → App → Settings → Domains. TLS is automatic on both.
6. `npm test`, push, verify live.
7. Google Search Console: add the new property, submit `sitemap.xml`, and keep the
   old property until traffic has migrated.

## Rollback

```bash
git revert <sha> && git push origin main main:gh-pages
```

Static site — a revert is a complete rollback.
