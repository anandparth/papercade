# papercade

**A pixel × hand-drawn design library.** Pixel-game UI (quest logs, XP bars, dialogue boxes, coin counters) fused with Excalidraw-style sketchiness (paper grain, ink strokes, hand-written notes) — one coherent system, unmistakably not a generic UI kit. Think *NES.css × Excalidraw, with a character in it*.

**Live demo:** https://anandparth.github.io/papercade/ · **License:** MIT (code) · CC BY 4.0 (art) · OFL (fonts)

## Quick start

One CDN tag, any HTML page, no framework required:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/papercade@0.1/dist/papercade.css" />

<body class="px-paper">
  <button class="px-btn px-btn--accent">recruit this unit</button>
  <div class="px-xp" role="progressbar" aria-valuenow="72" aria-valuemin="0" aria-valuemax="100">
    <span class="px-xp-fill" style="--px-xp: 72%"></span>
  </div>
</body>
```

Or from npm:

```sh
npm install papercade
```

```js
import "papercade"; // resolves to dist/papercade.css
```

(A second tag for the interactive elements — the sprite-sheet avatar, coin wallet, holo card — arrives when they ship.)

To hack on the library itself:

```sh
git clone https://github.com/anandparth/papercade
cd papercade
pnpm install
pnpm build        # tokens → dist/papercade.css (+ bundled fonts)
pnpm dev          # opens the live demo at a local vite server
```

## What's inside

| Layer | What | Status |
|---|---|---|
| Tokens | DTCG `tokens/tokens.json` → Style Dictionary → `--px-*` CSS custom properties (paper/ink palette, Excalidraw stroke+fill pairs, pixel motion curves) | ✅ |
| Surfaces & type | `.px-paper` / `.px-screen` dot-grid surfaces, `.px-mono` HUD labels, `.px-hand` notes, `.px-hl` marker highlight | ✅ |
| Static components | `.px-frame` pixel box · `.px-btn` sketch button · `.px-xp` / `.px-hp` meters | ✅ 3 of 8 |
| More static | sketch card · annotation + doodle arrow · RPG dialogue · HUD chip · quest-select list | planned |
| Custom elements | `<px-avatar>` (bring-your-own-sprite-sheet mascot) · `<px-coin>` wallet · holo unit card · flip card | planned |

v1 ships **exactly 12 components** and stops. No generic form controls — your `<select>` is fine as it is.

## Using & theming

- Everything is prefixed `px-`. Components are plain classes; state is plain modifier classes (`.is-gone`, `--screen`, `--accent`).
- All colors/fonts/motion come from `--px-*` custom properties — override any of them on `:root` or a subtree to retheme:

```css
.my-zone { --px-color-accent: #e03131; --px-frame-color: var(--px-color-sketch-blue-stroke); }
```

- Sounds (when they land) are **opt-in everywhere** — nothing plays audio by default.
- Every animation respects `prefers-reduced-motion`.
- Bundled fonts: Press Start 2P + Excalifont (both SIL OFL, license files ship in `dist/fonts/`). Keep pixel type at 16px+ (Press Start 2P is drawn on an 8px grid).

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
