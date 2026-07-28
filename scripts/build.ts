import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import StyleDictionary from "style-dictionary";

const pkg = JSON.parse(await readFile("package.json", "utf8")) as { version: string };

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

// 2. concat layer order: tokens -> base -> components
const parts: string[] = [
  "dist/tokens.css",
  "src/css/base.css",
  "src/css/components/frame.css",
  "src/css/components/button.css",
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
