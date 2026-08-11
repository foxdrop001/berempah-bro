# Running a promotion

The promo banner above the menu is driven by `promo` in `data/site.json`.

## Start a promotion

```jsonc
"promo": {
  "active": true,
  "kicker": "This Weekend Only",
  "title": "National Day Set",
  "desc": "One sentence explaining the offer and any conditions.",
  "code": "NDP26",                       // shown in analytics as promo_code
  "endsISO": "2026-08-10T23:59:59+08:00", // null = evergreen, no countdown
  "cta": "Order the set",
  "url": "https://berempahbros.oddle.me/"
}
```

- With `endsISO` set, a live countdown appears and the banner **hides itself
  automatically** once the deadline passes — no one has to remember to take it down.
- With `endsISO: null` the countdown is hidden and the banner runs until you set
  `active: false`.

## Stop a promotion

```jsonc
"active": false
```

Rebuild; the section renders nothing.

## Rules

- Only advertise offers the brand has actually confirmed (a poster, a message, or
  the ordering store). The current BEREMPAH6 code comes from their own store banner.
- Include the conditions in `desc` (minimum spend, first order only, caps).
  Misleading promo copy is a consumer-protection issue, not a design choice.
- Promo clicks are tracked as `promo_click` with the code attached, so you can
  measure which offers actually drive orders.

## Build, test, commit

```bash
npm run build && npm test
git commit -am "feat(promo): national day weekend set"
```
