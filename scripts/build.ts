import { execFileSync } from "node:child_process";
import { cp, readFile, writeFile } from "node:fs/promises";
import rough from "roughjs/bundled/rough.esm.js";
import StyleDictionary from "style-dictionary";
import { build as viteBuild } from "vite";

const pkg = JSON.parse(await readFile("package.json", "utf8")) as { version: string };

// Hand-drawn assets are baked here, never at runtime: deterministic (fixed
// rough.js seeds), SSR-safe, and free of a runtime dependency.
const svgUri = (w: number, h: number, body: string): string =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
  )}")`;

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
  return svgUri(300, 300, body);
}

// Painted through a CSS mask, so one baked asset serves every colour.
function doodleArrow(): string {
  const stroke = `stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"`;
  return svgUri(
    120,
    46,
    `<path d="M8,10 C 40,40 80,4 112,30" ${stroke} stroke-dasharray="4 7"/>` +
      `<path d="M112,30 L106,18M112,30 L99,27" ${stroke}/>`
  );
}

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
  "src/css/components/dialogue.css",
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

console.log(`papercade v${pkg.version}: css, fonts, art and elements built`);
