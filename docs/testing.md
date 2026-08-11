# Testing

```bash
npm test                       # everything (data gates + all pages)
node audit.mjs menu/index.html # one page
node qa-nojs.mjs               # render with JavaScript disabled
```

Chromium is required (`npx playwright install chromium`, done once).

## What `npm test` actually checks

**1. Data integrity** (fast, no browser)

- outlet slugs unique and lowercase-kebab
- 6-digit postcodes; coordinates inside Singapore's bounding box
- `HH:MM` hours; `+65 XXXX XXXX` phone format
- prices formatted `0.00`; referenced images exist on disk
- every published outlet has a generated page

**2. Build freshness** — `build.mjs` runs without error.

**3. Page audits** — each of the 12 pages is loaded in a real browser and checked for:

| Check | Why it exists |
|---|---|
| Every image loads and has an `alt` attribute | Broken images are invisible in code review |
| Every internal link resolves to a real file | URL restructures silently break links |
| External links have `rel="noopener"` | Tab-hijacking |
| No duplicate `id`s, no dead `aria-labelledby` | Screen-reader correctness |
| JSON-LD parses | A broken block silently kills rich results |
| Order builder maths | Price changes must not break the calculator |
| Promo visibility and countdown state | An expired promo showing is worse than none |
| Open-now chips render for every outlet with hours | Timezone/logic regressions |
| Form endpoints keep honeypot + captcha + subject | Losing spam protection is silent |
| No horizontal overflow at 1280 / 768 / 375 | The most common mobile regression |
| Mobile nav opens; sticky order bar visible | Core conversion path on phones |
| Zero console errors | Catches JS thrown on pages missing an element |

## What the tests cannot check

- **Whether a price is currently correct** — only that it's well-formed. Re-verify
  against the ordering store; see [update-menu.md](update-menu.md).
- **Whether the copy matches the brand's approved wording** — diff against the
  client's copy document after structural changes.
- **Visual regressions** — screenshots are written to `qa/` for manual review, not
  compared automatically. Worth adding if the design starts changing often.

## In CI

`.github/workflows/ci.yml` runs the build, fails if generated output differs from
what was committed (i.e. someone edited generated HTML by hand), then runs the
full suite. Screenshots upload as artifacts on failure.

## Enabling CI on GitHub

The workflow file is kept at `docs/ci-workflow.yml` because pushing files under
`.github/workflows/` requires a token with the `workflow` scope, which the
project's deploy token deliberately does not carry.

To turn CI on (once, from the GitHub web UI — no token change needed):

1. Repo → **Actions** → **New workflow** → **set up a workflow yourself**
2. Name it `ci.yml`
3. Paste the contents of `docs/ci-workflow.yml`
4. Commit

From then on every push and pull request runs the build, fails if generated
output was hand-edited, and runs the full audit suite.
