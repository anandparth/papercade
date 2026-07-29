/**
 * Records the walking-narrator hero as a GIF for the README.
 *
 * Drives the real page in a real browser rather than re-animating it, so the
 * GIF cannot drift from what ships. Needs a server running (`pnpm dev`); point
 * elsewhere with HERO_URL.
 *
 *   pnpm hero
 */
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { choreograph } from "./hero-take.ts";

const URL_ = process.env["HERO_URL"] ?? "http://localhost:5844/";
const RAW = "media/.raw";
const GIF = "media/hero.gif";
/** Taller than 780 so the walker renders at full size rather than the
    small-viewport variant, and narrow enough that he is not lost in the frame. */
const WIDTH = 900;
const HEIGHT = 800;
/** GIF width; smaller keeps the README light */
const OUT_WIDTH = 600;
const FPS = 10;

await rm(RAW, { recursive: true, force: true });
await mkdir(RAW, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  recordVideo: { dir: RAW, size: { width: WIDTH, height: HEIGHT } },
});
// recording starts here, so everything before the choreography — a blank page,
// navigation, fonts — is dead footage. Time it and trim it off precisely
// rather than eyeballing an offset.
const recordingStarted = Date.now();
const page = await context.newPage();

await page.goto(URL_, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);
const takeStarted = Date.now();

await page.evaluate(choreograph, 1);

const takeEnded = Date.now();
await page.waitForTimeout(300);
await context.close();
await browser.close();

const skip = (takeStarted - recordingStarted) / 1000;
const length = (takeEnded - takeStarted) / 1000;

const recorded = (await readdir(RAW)).find((f) => f.endsWith(".webm"));
if (!recorded) throw new Error("playwright wrote no video");
const source = join(RAW, recorded);

// two passes: build a palette from the whole clip, then apply it. A global
// palette avoids the colour churn a per-frame one causes on flat pixel art.
const filters = `fps=${FPS},scale=${OUT_WIDTH}:-1:flags=lanczos`;
const palette = join(RAW, "palette.png");
const trim = ["-ss", skip.toFixed(2), "-t", length.toFixed(2)];
execFileSync("ffmpeg", ["-v", "error", "-y", ...trim, "-i", source, "-vf", `${filters},palettegen=stats_mode=diff`, palette]);
execFileSync("ffmpeg", [
  "-v", "error", "-y", ...trim, "-i", source, "-i", palette,
  "-lavfi", `${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
  GIF,
]);

execFileSync("ffmpeg", ["-v", "error", "-y", ...trim, "-i", source, "-c", "copy", join("media", "hero.webm")]);
await rm(RAW, { recursive: true, force: true });

console.log(`hero recorded: ${GIF}`);
