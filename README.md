# Weekend Land Escape — website

Static site for **Weekend Land Escape**, an original fantasy kingdom trading card game.
Plain HTML + CSS + a little vanilla JS. No frameworks, no build step, no npm.

## Pages
| File | What it is |
|---|---|
| `index.html` | Home: hero, pitch, mana marks, featured cards, printed-decks "coming soon" |
| `cards.html` | Card gallery grouped by unit (incl. Race Wave 1, Wave 2, Minotaur Wave and Stand-alone Monster previews): jump nav, sticky filter/sort/search toolbar (mana, type, rarity, set; filters are shareable via the URL query), click-to-zoom lightbox |
| `rules.html` | Instruction manual (draft/playtest rules) with worked examples |
| `print.html` | Print-and-play PDF download + printing instructions |
| `404.html` | Not-found page (self-contained styles, works from any path) |

## Structure
```
assets/css/style.css        all styles
assets/js/main.js           mobile nav, gallery filters/sort/search, lightbox, #card deep links
assets/img/hero.jpg         homepage hero image (swap this one file to change it)
assets/img/og-image.jpg     1200x630 social share image
assets/img/cards/*.webp     full-size card art (1280 px wide)
assets/img/thumbs/*.webp    560 px thumbnails used in grids
assets/img/mana/*.webp      mana mark icons (cropped from the mana sheet; gold from the Treasure coin)
downloads/weekend-land-escape-print-and-play.pdf
favicon.ico, .nojekyll
```

All links and asset paths are **relative**, so the site works from a subpath such as
`https://USER.github.io/weekend-land-escape/`.

## Preview locally
```bash
cd wle-site
python3 -m http.server 8000
# open http://localhost:8000/
```

## Deploy to GitHub Pages
1. Create a repo (e.g. `weekend-land-escape`) and push the contents of this folder to the `main` branch root.
2. Repo **Settings → Pages → Build and deployment → Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The site appears at `https://USER.github.io/weekend-land-escape/` after a minute or two.

The `.nojekyll` file tells GitHub Pages to serve files as-is.

### Optional after deploy
Some social networks require an absolute `og:image` URL. Once you know the final address, replace
`content="assets/img/og-image.jpg"` in each page's `<head>` (`og:image` and `twitter:image`) with e.g.
`https://USER.github.io/weekend-land-escape/assets/img/og-image.jpg`.

## Updating content
- **Hero:** replace `assets/img/hero.jpg` (any aspect ratio; it is shown whole, nothing overlays it). Update its `alt` text in `index.html` if the picture changes.
- **Cards:** the HTML was generated from the card catalog JSON by a helper script kept outside this folder
  (`/workspace/wle-site-build/` on the build machine). You can also edit `cards.html` directly — each card is one `<figure class="card">` block.
- **Printed decks:** the "Coming soon" section in `index.html` is plain text — edit it when sales open.

© 2026 Weekend Land Escape. All card names and art are original.
