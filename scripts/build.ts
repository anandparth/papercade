import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import rough from "roughjs/bundled/rough.esm.js";
import StyleDictionary from "style-dictionary";

const pkg = JSON.parse(await readFile("package.json", "utf8")) as { version: string };

// Pre-bake a hand-drawn border as an SVG data-URI (build-time rough.js:
// deterministic via fixed seed — strokes never re-jitter between builds).
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
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
const sketchCss = `/* generated at build time by seeded rough.js — do not edit */
:root {
  --px-sketch-border-ink: ${sketchBorder("#222019", 42)};
  --px-sketch-border-screen: ${sketchBorder("#ece7da", 42)};
}
`;
await writeFile("dist/sketch.css", sketchCss);

// 2. concat layer order: tokens -> sketch assets -> base -> components
const parts: string[] = [
  "dist/tokens.css",
  "dist/sketch.css",
  "src/css/base.css",
  "src/css/components/frame.css",
  "src/css/components/button.css",
  "src/css/components/card.css",
  "src/css/components/xp.css",
];
const banner = `/*! papercade v${pkg.version} — a pixel × sketch design library | code MIT, art CC BY 4.0, fonts OFL */\n`;
const chunks = await Promise.all(parts.map((f) => readFile(f, "utf8")));
await writeFile("dist/papercade.css", banner + chunks.join("\n"));

// 3. fonts travel with the css (papercade.css references ./fonts/*)
await cp("src/fonts", "dist/fonts", { recursive: true });

// 4. refresh the demo site's copy (site/ is what CI deploys to GitHub Pages)
await rm("site/dist", { recursive: true, force: true });
await mkdir("site/dist", { recursive: true });
await cp("dist", "site/dist", { recursive: true });

console.log(`papercade v${pkg.version}: dist/papercade.css + fonts built, site/dist refreshed`);
