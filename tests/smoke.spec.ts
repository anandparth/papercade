import { expect, test, type Page } from "@playwright/test";

/**
 * These are deliberately functional rather than pixel comparisons. The defect
 * that prompted this suite — <px-avatar> writing a relative URL into a custom
 * property, which resolved against the stylesheet and 404'd — is caught exactly
 * by asserting the resolved asset loads. Screenshots would have caught it too,
 * but they drift between Windows and CI over font rendering, and a solo
 * maintainer should not be triaging phantom diffs.
 */

/** Records everything the page complained about, for the whole test. */
function watch(page: Page): { errors: string[]; broken: string[] } {
  const errors: string[] = [];
  const broken: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    // only our own assets — a wobbly CDN should not fail the build
    if (r.status() >= 400 && new URL(r.url()).hostname === "localhost") {
      broken.push(`${r.status()} ${r.url()}`);
    }
  });
  return { errors, broken };
}

test("the page loads with no console errors and no broken assets", async ({ page }) => {
  const { errors, broken } = watch(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(broken, "assets failed to load").toEqual([]);
  expect(errors, "console reported errors").toEqual([]);
});

test("every custom element upgrades", async ({ page }) => {
  await page.goto("/");
  const undefinedTags = await page.evaluate(() =>
    ["px-avatar", "px-coin", "px-holo-card", "px-flipcard"].filter((t) => !customElements.get(t))
  );
  expect(undefinedTags).toEqual([]);
});

test("a custom sprite sheet resolves to an absolute URL that loads", async ({ page }) => {
  await page.goto("/");
  const avatar = page.locator("px-avatar[src]").first();
  await expect(avatar).toBeVisible();

  const image = await avatar.evaluate((el) => getComputedStyle(el).backgroundImage);
  const href = /url\("?([^")]+)"?\)/.exec(image)?.[1];

  expect(href, "background-image should carry a url()").toBeTruthy();
  // the regression: a relative value here gets re-based against the stylesheet
  expect(href).toMatch(/^https?:\/\//);
  expect(href).not.toContain("/dist/dist/");

  const asset = await page.request.get(href as string);
  expect(asset.status(), `sprite sheet at ${href}`).toBe(200);
});

test("the bundled mascot loads for an avatar with no src", async ({ page }) => {
  await page.goto("/");
  const image = await page
    .locator("px-avatar:not([src])")
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  const href = /url\("?([^")]+)"?\)/.exec(image)?.[1];
  const asset = await page.request.get(href as string);
  expect(asset.status(), `default sheet at ${href}`).toBe(200);
});

test("both bundled fonts are actually applied", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => ({
    pixel: document.fonts.check("16px 'Press Start 2P'"),
    sketch: document.fonts.check("16px 'Excalifont'"),
  }));
  expect(loaded).toEqual({ pixel: true, sketch: true });
});

test("collecting a coin banks it and persists", async ({ page }) => {
  await page.goto("/");
  const readout = page.locator("[data-px-coins]").first();
  await expect(readout).toHaveText("0");

  await page.locator("px-coin").first().click();
  await expect(readout).toHaveText("1");

  await page.reload();
  await expect(page.locator("[data-px-coins]").first()).toHaveText("1");
});

test("the flip card is operable by keyboard and announces its state", async ({ page }) => {
  await page.goto("/");
  const card = page.locator("px-flipcard").first();
  await expect(card).toHaveAttribute("aria-pressed", "false");
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await expect(card).toHaveAttribute("flipped", "");
});

test("meters expose their values to assistive tech", async ({ page }) => {
  await page.goto("/");
  const meters = page.locator('[role="progressbar"]');
  const count = await meters.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const meter = meters.nth(i);
    await expect(meter).toHaveAttribute("aria-valuenow", /\d+/);
    await expect(meter).toHaveAttribute("aria-valuemax", /\d+/);
  }
});

test("every focusable element wears the library's focus ring, not the browser's", async ({ page }) => {
  await page.goto("/");
  // the custom elements carry no class, so a [class^="px-"] selector misses
  // them and the UA hairline wins — invisible on the dark --screen surfaces
  for (const tag of ["px-coin", "px-flipcard", "px-holo-card"]) {
    const outline = await page
      .locator(tag)
      .first()
      .evaluate((el) => {
        (el as HTMLElement).focus({ focusVisible: true });
        return getComputedStyle(el).outlineWidth;
      });
    expect(outline, `${tag} has no library focus ring`).toBe("3px");
  }
});

test("reduced motion stops sprite playback dead rather than running it fast", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const animation = await page
    .locator("px-avatar:not([src])")
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  // the global guard shortens durations; sprites must opt out entirely, or a
  // 0.001s steps() animation would strobe through the frames
  expect(animation).toBe("none");
});
