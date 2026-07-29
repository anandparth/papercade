/**
 * The hero take: how the page is driven while it is being recorded.
 *
 * Lives on its own because two recorders share it — the light README GIF
 * (record-hero.ts) and the high-resolution master (record-hero-hq.ts). It runs
 * inside the browser via page.evaluate, so it must close over nothing.
 *
 * `pace` stretches the whole take. High-density capture is slow, so running the
 * take slower lands more frames per unit of movement; the recorder then speeds
 * the result back up. The typewriter keeps its own clock and so reads faster in
 * a paced take — the trade for sharpness.
 */
export const choreograph = async (pace = 1): Promise<void> => {
  const section = document.querySelector<HTMLElement>("[data-walk]");
  if (!section) throw new Error("no [data-walk] section on the page");

  const top = section.offsetTop;
  const travel = section.offsetHeight - window.innerHeight;
  const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

  const glideTo = (progress: number, at: number): Promise<void> =>
    new Promise((done) => {
      const from = window.scrollY;
      const target = top + progress * travel;
      const started = performance.now();
      const ms = at * pace;
      const step = (): void => {
        const k = Math.min(1, (performance.now() - started) / ms);
        window.scrollTo(0, from + (target - from) * ease(k));
        if (k < 1) requestAnimationFrame(step);
        else done();
      };
      step();
    });

  const dwell = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms * pace));

  await glideTo(0, 650);
  await dwell(450);
  // pause on each waypoint long enough for the line to finish typing
  for (const stop of [0.08, 0.36, 0.64, 0.9]) {
    await glideTo(stop, 850);
    await dwell(1000);
  }
  await glideTo(1, 650);
};
