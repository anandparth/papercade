/**
 * Records a high-resolution master of the walking-narrator hero.
 *
 * Chromium's screencast captures CSS pixels and pads the result to whatever
 * size you ask for, so recordVideo cannot produce a high-DPI take — the pixels
 * simply are not there. Screenshots DO honour deviceScaleFactor, so this walks
 * the same choreography and grabs full-density frames as fast as the encoder
 * allows, stamping each one. The stamps are what make it watchable: the capture
 * rate is uneven, so frames are assembled with their real durations rather than
 * assumed to be evenly spaced.
 *
 * Density is a straight trade against frame rate — roughly 13fps at 2x, 7 at
 * 3x, 4 at 4x on this machine. 2x is the sweet spot for motion; use 3x or 4x
 * when sharpness matters more than smoothness.
 *
 *   HERO_URL=https://anandparth.github.io/papercade/ node scripts/record-hero-hq.ts
 */
import { execFileSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { choreograph } from "./hero-take.ts";

const URL_ = process.env["HERO_URL"] ?? "http://localhost:5844/";
const RAW = "media/.hq";
const WIDTH = Number(process.env["HERO_VIEW_W"] ?? 960);
const HEIGHT = 800;
const DENSITY = Number(process.env["HERO_DENSITY"] ?? 2);
const GIF_WIDTH = Number(process.env["HERO_WIDTH"] ?? 1200);
const GIF = process.env["HERO_GIF"] ?? "media/hero-hq.gif";
const CLIP = process.env["HERO_CLIP"] ?? "media/hero-hq.mp4";
/** constant rate the uneven capture is resampled onto */
const FPS = Number(process.env["HERO_FPS"] ?? 15);
/** run the take this many times slower, then speed the footage back up */
const PACE = Number(process.env["HERO_PACE"] ?? 1);

await rm(RAW, { recursive: true, force: true });
await mkdir(RAW, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: DENSITY,
});
const page = await context.newPage();
await page.goto(URL_, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);

// the take runs at its own pace in the page; we grab frames alongside it
let finished = false;
const take = page.evaluate(choreograph, PACE).then(() => {
  finished = true;
});

const stamps: number[] = [];
let index = 0;
while (!finished) {
  const shot = await page.screenshot({ type: "png" });
  await writeFile(join(RAW, `f${String(index).padStart(5, "0")}.png`), shot);
  stamps.push(Date.now());
  index += 1;
}
await take;

const poster = await page.screenshot({ type: "png" });
await writeFile("media/hero-poster.png", poster);
await context.close();
await browser.close();

if (index < 2) throw new Error("captured too few frames to assemble");

// each frame is shown for the gap until the next one actually arrived
const list = stamps
  .map((at, i) => {
    const next = stamps[i + 1] ?? at + 80;
    return `file 'f${String(i).padStart(5, "0")}.png'\nduration ${((next - at) / 1000).toFixed(4)}`;
  })
  .join("\n");
// concat needs the final frame named twice or it is dropped
await writeFile(join(RAW, "list.txt"), `${list}\nfile 'f${String(index - 1).padStart(5, "0")}.png'\n`);

const concat = ["-f", "concat", "-safe", "0", "-i", join(RAW, "list.txt")];
// undo the pacing here, so the footage plays at the speed the take was designed for
const speed = PACE === 1 ? "" : `setpts=PTS/${PACE},`;
execFileSync("ffmpeg", [
  "-v", "error", "-y", ...concat,
  "-vf", `${speed}fps=${FPS}`, "-c:v", "libx264", "-preset", "slow", "-crf", "16",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", CLIP,
]);

// two passes: a palette built from the whole clip, then applied. A global
// palette avoids the colour churn a per-frame one causes on flat pixel art.
const filters = `${speed}fps=${FPS},scale=${GIF_WIDTH}:-1:flags=lanczos`;
const palette = join(RAW, "palette.png");
execFileSync("ffmpeg", ["-v", "error", "-y", ...concat, "-vf", `${filters},palettegen=max_colors=256:stats_mode=diff`, palette]);
execFileSync("ffmpeg", [
  "-v", "error", "-y", ...concat, "-i", palette,
  "-lavfi", `${filters}[x];[x][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle`,
  GIF,
]);

await rm(RAW, { recursive: true, force: true });

const seconds = (stamps[stamps.length - 1]! - stamps[0]!) / 1000;
console.log(
  `captured ${index} frames at ${WIDTH * DENSITY}x${HEIGHT * DENSITY} ` +
    `(${(index / seconds).toFixed(1)} fps over ${seconds.toFixed(1)}s)\n` +
    `  ${CLIP}\n  ${GIF} (${GIF_WIDTH}px)\n  media/hero-poster.png`,
);
