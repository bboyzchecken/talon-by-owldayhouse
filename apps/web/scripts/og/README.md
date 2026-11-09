# Share cards

The image Facebook, LINE and X show when a page is posted. Without one, every link
looks identical, so each page carries its own card.

```
cards.json      one entry per card: out (file name), label, headline, photo
build.mjs       renders every card to public/og/<out>.jpg (1200×630)
news-art.mjs    generates the photography that has no counterpart on the site
art/            that generated photography — a build input, never served
```

## Rendering the cards

```
node scripts/og/build.mjs
```

Each card is laid out as HTML in the brand fonts and screenshotted with headless
Chrome, so Thai type matches the site. The output is committed; the static export
just copies `public/og/`.

## Adding a page

1. Add an entry to `cards.json`. The file name under `out` is what the page asks
   for: `localeCard(locale, "work")` → `work.jpg` and `work-en.jpg`.
2. Re-run `build.mjs`.
3. Pass `image: localeCard(locale, "<name>")` (or `shareCard("<name>")` for a
   Thai-only page) to `pageMeta` — see `lib/share-cards.ts`.

A page whose card is missing from `cards.json` falls back to the brand card at
`public/og.png`, so step 3 is safe to do first.

## Photography

Service and industry cards reuse the page's own photo from `public/imagery/`.
The rest — sections and articles — have no photo on the site, so `news-art.mjs`
generates one with the FLUX image API, matching the site's photography: bright,
white and pale grey, soft daylight, one warm golden accent, no text.

```
BFL_API_KEY=... node scripts/og/news-art.mjs            # every scene
BFL_API_KEY=... node scripts/og/news-art.mjs work tools # only these
```

Keep the key in your shell, never in the repo. Re-run a single scene until the
frame is right, then re-run `build.mjs`.

## After deploying

Facebook caches the first version it scrapes. Paste the URL into the
[Sharing Debugger](https://developers.facebook.com/tools/debug/) and press
"Scrape Again" for any page that was shared before its card existed.
