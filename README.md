# papercade

**A pixel × hand-drawn design library.** Pixel-game UI (quest logs, XP bars, dialogue boxes, coin counters) fused with Excalidraw-style sketchiness (paper grain, ink strokes, hand-written notes) — one coherent system, unmistakably not a generic UI kit. Think *NES.css × Excalidraw, with a character in it*.

**Live demo:** https://anandparth.github.io/papercade/ · **License:** MIT (code) · CC BY 4.0 (art) · OFL (fonts)

## Quick start

Two CDN tags, any HTML page, no framework required. The second one is only needed for the interactive elements:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/papercade@0.1/dist/papercade.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/papercade@0.1/dist/papercade.js"></script>

<body class="px-paper">
  <button class="px-btn px-btn--accent">recruit this unit</button>

  <div class="px-xp" role="progressbar" aria-valuenow="72" aria-valuemin="0" aria-valuemax="100">
    <span class="px-xp-fill" style="--px-xp: 72%"></span>
  </div>

  <px-avatar src="my-hero.webp" frames="6" rows="2" width="96" height="96" alt="My hero"></px-avatar>
</body>
```

Or from npm:

```sh
npm install papercade
```

```js
import "papercade";            // the stylesheet
import "papercade/elements";   // registers <px-avatar> and friends (typed)
```

To hack on the library itself:

```sh
git clone https://github.com/anandparth/papercade
cd papercade
pnpm install
pnpm build        # tokens + css + fonts + art + element bundles -> dist/
pnpm watch        # rebuild on change, in one terminal
pnpm dev          # live demo at localhost:5844, in another
```

## What's inside

| Layer | What | Status |
|---|---|---|
| Tokens | DTCG `tokens/tokens.json` → Style Dictionary → `--px-*` CSS custom properties (paper/ink palette, Excalidraw stroke+fill pairs, pixel motion curves) | ✅ |
| Surfaces & type | `.px-paper` / `.px-screen` dot-grid surfaces, `.px-mono` HUD labels, `.px-hand` notes, `.px-hl` marker highlight | ✅ |
| Static components | `.px-frame` pixel box · `.px-btn` sketch button · `.px-card` sketch card (build-time rough.js border) · `.px-dialogue` RPG dialogue · `.px-note` / `.px-arrow` annotation · `.px-quest` quest select · `.px-chip` HUD chip · `.px-xp` / `.px-hp` meters | ✅ 8 of 8 |
| Custom elements | `<px-avatar>` bring-your-own-sprite-sheet mascot · `<px-coin>` collectible + shared wallet · `<px-holo-card>` foil tilt · `<px-flipcard>` two-face turn | ✅ 4 of 4 |

v1 ships **exactly 12 components** and stops. No generic form controls — your `<select>` is fine as it is. Every element is light-DOM and does as little as possible: the motion lives in CSS custom properties, so the markup still renders when the script does not.

## Using & theming

- Everything is prefixed `px-`. Components are plain classes; state is plain modifier classes (`.is-gone`, `--screen`, `--accent`).
- All colors/fonts/motion come from `--px-*` custom properties — override any of them on `:root` or a subtree to retheme:

```css
.my-zone { --px-color-accent: #e03131; --px-frame-color: var(--px-color-sketch-blue-stroke); }
```

- Sounds (when they land) are **opt-in everywhere** — nothing plays audio by default.
- Every animation respects `prefers-reduced-motion`.
- Bundled fonts: Press Start 2P + Excalifont (both SIL OFL, license files ship in `dist/fonts/`). Keep pixel type at 16px+ (Press Start 2P is drawn on an 8px grid).

### Your own mascot

`<px-avatar>` takes any uniform sprite grid — `frames` columns by `rows` rows. `width`/`height` are the **cell** size, so set both together to keep your sheet's aspect ratio. `row` picks the state (walk left, idle, celebrate — whatever your rows mean), `fps` sets the pace, `paused` holds the first frame, and `alt` makes it announced rather than decorative. It also exposes `play()`, `pause()`, and `playing`.

```html
<px-avatar src="hero.webp" frames="6" rows="3" row="2" fps="10" width="96" height="96" pixelated></px-avatar>
```

Omit `src` and you get the bundled mascot (my pixel self, CC BY 4.0 — attribution required, see `LICENSE-GRAPHICS`). Your own sheet stays entirely yours; the component imposes no license on it. Playback is pure CSS, so the markup renders even if the script never loads.

### Coins

`<px-coin>` banks its `value` (default 1) into one wallet shared by every coin on the site, persisted in `localStorage` and synced across tabs. Any element with `data-px-coins` becomes a live readout — pair it with `.px-chip` for the HUD look. Add `sticky` to keep a coin collectable forever, `sound` to opt that coin into a short blip (silence is the default, everywhere), and `label` to name it for screen readers. Each collect fires a bubbling `px-collect` event carrying `{ value, total }`.

```html
<px-coin value="5"></px-coin>
<span class="px-chip">coins <b data-px-coins>0</b></span>
```

Drive the wallet directly when you need to — `coins.add(-10)` is how you build a shop:

```js
import { coins } from "papercade/elements";
coins.subscribe((total) => console.log(total));  // returns an unsubscribe
```

### Cards

`<px-holo-card>` tilts toward the pointer and lights a foil sheen made from the library's own sketch palette; it writes `--px-holo-x` / `--px-holo-y` (−1 to 1) once per frame and CSS does the rest. The foil is four gradient stops plus a blend mode, so a new one is an override rather than a fork — `--gold` (coin palette) and `--soft` (screen blend) ship as examples:

```css
.my-foil {
  --px-holo-foil-1: #7de2d1; --px-holo-foil-2: #ff8fab;
  --px-holo-foil-3: #c9f299; --px-holo-foil-4: #ffd6a5;
  --px-holo-blend: screen;   /* color-dodge is punchier, screen is gentler */
  --px-holo-angle: 135deg;
}
``` `<px-flipcard>` turns over on click or Enter, toggling a `flipped` attribute you can also set yourself; give it two `.px-flipcard-face` children (the second marked `--back`) and an `aspect`. Both are keyboard-operable and announced.

## Extending

To add a component (the pattern the whole library follows):

1. Create `src/css/components/<name>.css` — classes prefixed `px-`, all values from `--px-*` tokens, include a `--screen` dark preset and a reduced-motion-safe transition. Add a usage comment block at the top of the file.
2. Register the file in the `parts` array in `scripts/build.mjs` (order matters: tokens → base → components).
3. Add a demo section to `site/index.html` — the demo page is the visual test.
4. `pnpm build && pnpm dev` and check both light and `--screen` variants.

New tokens go in `tokens/tokens.json` (DTCG format), never hardcoded in component CSS.

## Contributing

Issues and PRs welcome. Ground rules: uniqueness over completeness (no generic components), accessibility is a feature not a chore (focus-visible, ARIA roles, reduced-motion paths are required, not optional), and no Nintendo assets, character names, or sound-alikes — this library evokes an era, not a company.

## For AI agents

If you are an AI coding agent working in this repo: the token file `tokens/tokens.json` is the single source of truth for all design values; `scripts/build.ts` defines the CSS layer order; components live one-per-file in `src/css/components/` with usage documented in the file's header comment; the demo page `site/index.html` doubles as the visual regression surface — every component change must be reflected there. All script/element code is strict TypeScript (`pnpm typecheck` must pass; no `.js` source files, no `any`); interactive elements ship bundled via Vite library mode with type declarations. Follow the four rules in the Extending section exactly. Do not add dependencies, do not add generic UI components, and do not remove `prefers-reduced-motion` or focus-visible handling.
