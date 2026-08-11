# Adding or updating an outlet

Everything about an outlet lives in `data/site.json`. Adding one updates the
locations page, generates a dedicated outlet page with local SEO, adds it to the
sitemap, the homepage stall count, the catering dropdown and the structured data —
all from one edit.

## 1. Gather the facts (do not guess any of these)

| Field | Where to get it |
|---|---|
| Full address + unit number | The brand / the hawker centre's own listing |
| Postal code | Same. Must be 6 digits |
| Opening hours | The brand — press articles are often stale |
| Coordinates | https://www.onemap.gov.sg/ — search the postal code |
| Phone | The brand (optional; format `+65 XXXX XXXX`) |

Get coordinates from OneMap in one command:

```bash
curl -s "https://www.onemap.gov.sg/api/common/elastic/search?searchVal=588177&returnGeom=Y&getAddrDetails=Y&pageNum=1"
```

Check the `BUILDING` field in the response matches the outlet before using `LATITUDE`/`LONGITUDE`.

## 2. Add the entry

Copy `_unpublishedOutletExample` from the bottom of `data/site.json` into the
`outlets` array and fill it in:

```json
{
  "slug": "tampines",
  "brand": "Berempah Bros",
  "name": "Tampines Round Market",
  "badge": "Tampines",
  "address": "137 Tampines Street 11, #01-23",
  "postal": "521137",
  "hours": { "display": "Daily 10:30am – 8:30pm", "open": "10:30", "close": "20:30" },
  "transport": "Tampines MRT · EW2",
  "phone": null,
  "geo": { "lat": 1.3496, "lng": 103.9447 },
  "mapsQuery": "Berempah Bros Tampines Round Market",
  "opened": "2026-09",
  "published": true
}
```

Notes:
- `slug` becomes the URL (`/locations/tampines/`) — lowercase, hyphens only, never change it after launch.
- `hours.open`/`close` drive the live "Open now" chip. If hours aren't confirmed, set both to `null` and write `"display": "Opening hours to be confirmed"`.
- `published: false` keeps a draft in the file without putting it on the site.
- For a sister brand set `"brand": "Gepuk Guys"` — it gets the pandan-green treatment automatically.

## 3. Build and verify

```bash
npm run build
npm test
```

The tests will fail loudly if the postcode is malformed, the coordinates fall
outside Singapore, the hours format is wrong, or the page didn't generate.

## 4. Commit

```bash
git add -A && git commit -m "feat(outlets): add Tampines Round Market"
git push
```

CI re-runs the build and audits. GitHub Pages publishes within a minute or two.

## Removing or pausing an outlet

Set `"published": false` and rebuild — the page, sitemap entry and cards
disappear cleanly. Prefer this to deleting the entry, so the details survive if
the stall reopens.

## When the 6th outlet is confirmed

The site currently shows a "Just Dropped" placeholder card. Once you have the
real address, add it here and delete the placeholder block in
`locations/index.html` (search for `PLACEHOLDER`).
