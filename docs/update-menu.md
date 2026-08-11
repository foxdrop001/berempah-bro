# Updating the menu

All prices and items live in `data/site.json` under `menu`. One edit updates the
menu cards, the order builder, the sides list, the structured data Google reads,
and the menu note.

## Verify before you edit

Menu prices **must** match the brand's live ordering store:
<https://berempahbros.oddle.me/>

Two price sets exist and they are intentionally different:

- `sides` — à-la-carte prices (what a side costs on its own)
- `setAddOns` — modifier prices (cheaper; what it costs added to a set)

To read the modifier prices, open the ordering store, click **Add** on Ayam
Berempah, and expand the "Side Add Ons" / "Meat Add Ons" accordions.

## Editing

```jsonc
{
  "slug": "ayam",              // stable id, used for the image filename
  "name": "Ayam Berempah",
  "price": "9.00",             // always two decimals
  "image": "ayam",             // assets/ayam.webp + assets/sm/ayam.webp must exist
  "tags": ["Bestseller", "Thigh or Breast"],
  "desc": "Short line shown on the card",
  "menuDesc": "Long description used in structured data"
}
```

Adding a new dish also needs images:

```bash
# put the full-size photo at assets/<slug>.webp, then make the mobile variant:
python -c "from PIL import Image; im=Image.open('assets/newdish.webp'); im.resize((800,int(im.height*800/im.width))).save('assets/sm/newdish.webp','WEBP',quality=80)"
```

Tests fail if a referenced image is missing.

## Chicken cuts

`menu.chickenParts` drives the builder's cut selector. It is currently
`["Thigh", "Breast"]` — matching the real ordering options. Do not add "Wing"
back; press coverage listed it but the live menu does not offer it.

## Build, test, commit

```bash
npm run build && npm test
git commit -am "fix(menu): update unagi price to 14.90"
```

## After updating

Update `menu._source` with the date you verified, so the next person knows how
stale the numbers are.
