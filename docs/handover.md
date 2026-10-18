# Handing the site over to a new owner

Everything the site needs lives in two places the new owner controls:

| What | Where | Tied to an account? |
|---|---|---|
| Code, pages, photos, menu, news | GitHub repository | Yes: move it (step 1) |
| Hosting, secret settings, dashboard login | Vercel project | Yes: re-create it (step 2) |
| Push notification subscribers | Upstash Redis database (inside Vercel) | Yes: re-create it, then copy subscribers (step 3) |
| Domain `berempahbros.com` | Domain registrar (GoDaddy) | Point it at the new Vercel project (step 5) |
| Brand email, Oddle store, phone numbers | `data/site.json` | No, already the brand's own |

No passwords, keys or tokens are stored in the repository. They are all
Vercel settings, listed in step 2.

Do the steps in order. The old setup keeps running until step 6, so the site
never goes down.

---

## 1. GitHub repository

Either **transfer** it (GitHub repo → Settings → General → Danger Zone →
Transfer ownership; keeps the full history) or have the new owner **import** it
into their own account.

Then edit `data/site.json` in the new repository:

```json
"github": { "owner": "NEW-OWNER", "repo": "berempah-bro", "branch": "main" }
```

and run `npm run build`, commit and push. The dashboard saves to whatever repo
is named here.

## 2. Vercel project

On the new owner's Vercel account: **Add New → Project → Import** the GitHub
repository. Leave the framework as "Other"; `vercel.json` already sets the build.

> Vercel's free Hobby plan is for non-commercial use. A business site belongs
> on the Pro plan.

Under **Settings → Environment Variables** (Production), add:

| Name | Value |
|---|---|
| `ADMIN_PATH` | Secret dashboard address, e.g. `kitchen-x7k2q9` → site.com/kitchen-x7k2q9/ |
| `ADMIN_USER` | Dashboard login name |
| `ADMIN_PASSWORD` | Dashboard password (long) |
| `VAPID_PUBLIC_KEY` | Copy from the old project (see below) |
| `VAPID_PRIVATE_KEY` | Copy from the old project (see below) |
| `VAPID_SUBJECT` | Optional: `mailto:` address push services can contact. Defaults to the brand email. |

**VAPID keys:** to keep existing subscribers, use the **same pair** as the old
project. The old owner sends them privately (not in chat or email in plain
text, ideally via a password manager share). If there are no subscribers worth
keeping, make a fresh pair instead:

```bash
node tools/vapid.mjs
```

Without `ADMIN_*` set the dashboard is simply off. Without the VAPID keys and
the database the "Get notified" button stays hidden. Nothing breaks.

## 3. Push notification database

In the new Vercel project: **Storage → Create Database → Upstash for Redis**,
Free plan, region Singapore (`sin1`), and connect it to the project. It adds
`KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.

Then copy the subscribers across. The details for each database are in Vercel
→ Storage → the database → **.env.local** tab:

```bash
KV_REST_API_URL=<old url> KV_REST_API_TOKEN=<old token> node tools/push-subscribers.mjs export > subscribers.json
KV_REST_API_URL=<new url> KV_REST_API_TOKEN=<new token> node tools/push-subscribers.mjs import < subscribers.json
```

Delete `subscribers.json` afterwards. (On Windows PowerShell set the two
variables first with `$env:KV_REST_API_URL = '...'` and so on.)

Finally **Deployments → ⋯ → Redeploy** so the new settings take effect.

## 4. Check the new deployment

On the new `*.vercel.app` address:

- `/admin/` shows "Not found" (expected).
- `/<ADMIN_PATH>/` asks for the login, then shows the dashboard.
- Dashboard → **Connect GitHub** with a fine-grained token from the **new
  owner's** GitHub account: only this repository, permission
  **Contents: Read and write**. Make a small edit and Save & Publish.
- Dashboard → **Notify** shows the subscriber count.
- `/api/push/config` shows `"enabled": true`.

## 5. Domain

Vercel project → **Settings → Domains → Add** `berempahbros.com` (and
`www.berempahbros.com`). Vercel shows the exact DNS records to set at the
registrar, typically:

| Type | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

Remove GoDaddy's parking/forwarding first. Once Vercel shows the domain as
valid, set `"baseUrl": "https://www.berempahbros.com"` in `data/site.json`
(use whichever of the two Vercel lists as primary; the other redirects to it),
`npm run build`, commit and push. That updates canonical links, the sitemap,
share previews and form redirects in one go. The printed QR code already
points to `https://berempahbros.com/`.

## 6. Switch off the old setup

Only after step 4 works:

- Old Vercel project: delete it, or at least remove its domain and settings.
- Old Upstash database: delete it (after the subscriber export).
- GitHub Pages: repo → Settings → Pages → Source: **None**.
- DigitalOcean app (if it still exists): delete it. `.do/app.yaml`,
  `docs/migrate-digitalocean.md`, `docs/publish-workflow.yml` and the GitHub
  Pages parts of `docs/deploy.md` describe those retired hosts.
- Old dashboard tokens: revoke them at github.com/settings/personal-access-tokens.

## 7. Accounts the brand already owns (no change needed)

- **FormSubmit** sends the contact, catering and Crunch Club forms to
  `site.email`. If that inbox changes, the new inbox must click FormSubmit's
  one-time activation email.
- **Oddle** ordering store (`site.orderUrl`).
- **Google Analytics**: paste the brand's own GA4 id in the dashboard's
  Settings tab when ready.

---

## Checklist

- [ ] Repository moved, `site.github` updated, rebuilt and pushed
- [ ] Vercel project imported on the new account (Pro plan)
- [ ] `ADMIN_PATH`, `ADMIN_USER`, `ADMIN_PASSWORD` set
- [ ] VAPID keys copied (or new pair made)
- [ ] Upstash Redis created and connected, subscribers imported
- [ ] Redeployed; dashboard login, save and Notify tab all work
- [ ] Domain connected, `baseUrl` matches the primary domain (currently `https://www.berempahbros.com`)
- [ ] Old Vercel project, database, GitHub Pages, DigitalOcean and tokens switched off
