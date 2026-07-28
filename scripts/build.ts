import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, readFile, symlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import rough from "roughjs/bundled/rough.esm.js";
import StyleDictionary from "style-dictionary";
import { build as viteBuild } from "vite";

const pkg = JSON.parse(await readFile("package.json", "utf8")) as { version: string };

// Hand-drawn assets are baked here, never at runtime: deterministic (fixed
// rough.js seeds), SSR-safe, and free of a runtime dependency.
const svgUri = (attrs: string, body: string): string =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`
  )}")`;

const box = (w: number, h: number): string => `width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"`;

function sketchBorder(stroke: string, seed: number): string {
  const gen = rough.generator();
  const drawable = gen.rectangle(10, 10, 280, 280, {
    seed,
    roughness: 1.6,
    bowing: 1.4,
    stroke,
    strokeWidth: 2.5,
  });
  const body = gen
    .toPaths(drawable)
    .map(
      (p) =>
        `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="none" stroke-linecap="round"/>`
    )
    .join("");
  return svgUri(box(300, 300), body);
}

// Painted through a CSS mask, so one baked asset serves every colour.
function doodleArrow(): string {
  const stroke = `stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"`;
  return svgUri(
    box(120, 46),
    `<path d="M8,10 C 40,40 80,4 112,30" ${stroke} stroke-dasharray="4 7"/>` +
      `<path d="M112,30 L106,18M112,30 L99,27" ${stroke}/>`
  );
}

// ASCII map -> crisp pixel art. Cells overlap by 0.03 so no seams show.
function pixelSprite(map: readonly string[], palette: Readonly<Record<string, string>>): string {
  const cols = map[0]?.length ?? 0;
  const rects = map
    .flatMap((row, y) =>
      [...row].map((ch, x) => {
        const fill = palette[ch];
        return fill ? `<rect x="${x}" y="${y}" width="1.03" height="1.03" fill="${fill}"/>` : "";
      })
    )
    .join("");
  return svgUri(`viewBox="0 0 ${cols} ${map.length}" shape-rendering="crispEdges"`, rects);
}

const COIN = pixelSprite(
  [
    "..YYYY..",
    ".YWYYYY.",
    "YWYDDYYY",
    "YYYDDYYY",
    "YYYDDYYY",
    "YYYDDYYY",
    ".YYYYYY.",
    "..YYYY..",
  ],
  { Y: "#ffd23e", D: "#c4973f", W: "#fff3c4" }
);

// 1. tokens.json (DTCG) -> dist/tokens.css custom properties, prefixed --px-*
const sd = new StyleDictionary({
  source: ["tokens/tokens.json"],
  platforms: {
    css: {
      transformGroup: "css",
      prefix: "px",
      buildPath: "dist/",
      files: [{ destination: "tokens.css", format: "css/variables" }],
    },
  },
});
await sd.buildAllPlatforms();

// 1b. generated sketch assets (seed 42 = the papercade stroke; do not change casually)
const sketchCss = `/* generated at build time — do not edit */
:root {
  --px-sketch-border-ink: ${sketchBorder("#222019", 42)};
  --px-sketch-border-screen: ${sketchBorder("#ece7da", 42)};
  --px-doodle-arrow: ${doodleArrow()};
  --px-coin-sprite: ${COIN};
}
`;
await writeFile("dist/sketch.css", sketchCss);

// 2. concat layer order: tokens -> sketch assets -> base -> components
const parts: string[] = [
  "dist/tokens.css",
  "dist/sketch.css",
  "src/css/base.css",
  "src/css/components/frame.css",
  "src/css/components/avatar.css",
  "src/css/components/button.css",
  "src/css/components/card.css",
  "src/css/components/chip.css",
  "src/css/components/coin.css",
  "src/css/components/dialogue.css",
  "src/css/components/flipcard.css",
  "src/css/components/holo.css",
  "src/css/components/note.css",
  "src/css/components/quest.css",
  "src/css/components/xp.css",
];
const banner = `/*! papercade v${pkg.version} — a pixel × sketch design library | code MIT, art CC BY 4.0, fonts OFL */\n`;
const chunks = await Promise.all(parts.map((f) => readFile(f, "utf8")));
await writeFile("dist/papercade.css", banner + chunks.join("\n"));

// 3. fonts and the default mascot travel with the css, which references
//    ./fonts/* and ./art/* relative to itself
await cp("src/fonts", "dist/fonts", { recursive: true });
await cp("src/art", "dist/art", { recursive: true });

// 4. custom elements -> ESM + UMD bundles, plus hand-off type declarations
await viteBuild({
  configFile: false,
  logLevel: "warn",
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: "src/elements/index.ts",
      name: "papercade",
      fileName: "papercade",
      formats: ["es", "umd"],
    },
  },
});
execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.build.json"], {
  stdio: "inherit",
});

// 4b. the demo page's hero script. Not part of the library — it composes
//     shipped components against scroll, so it ships beside them, unexported.
await viteBuild({
  configFile: false,
  logLevel: "warn",
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: { entry: "src/demo/walker.ts", fileName: () => "demo.js", formats: ["es"] },
  },
});

// 5. the demo loads ./dist/* relative to itself. Link rather than copy, so the
//    same relative path resolves in dev and in the deployed artifact, and the
//    build stays the single source of those files. CI copies instead.
if (!existsSync("site/dist")) {
  try {
    await symlink(resolve("dist"), "site/dist", "junction");
  } catch {
    console.warn("could not link site/dist — copy dist/ into site/ to preview");
  }
}

console.log(`papercade v${pkg.version}: css, fonts, art and elements built`);
