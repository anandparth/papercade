/**
 * The walking narrator — the demo page's hero.
 *
 * Not a papercade component: this is demo code that composes three shipped
 * ones (<px-avatar>, .px-dialogue, .px-note) against scroll position. The
 * character IS the scroll indicator; the pencil route inks itself behind him
 * and he stops to talk at waypoints.
 *
 * Everything here reads scroll and writes custom properties, so the section
 * still renders as a static scene if this script never loads.
 */

interface Waypoint {
  /** progress through the section, 0-1 */
  readonly at: number;
  readonly text: string;
}

const WAYPOINTS: readonly Waypoint[] = [
  { at: 0.08, text: "THIS ISN'T A SCROLLBAR. IT'S ME." },
  { at: 0.36, text: "THE PENCIL ROUTE INKS ITSELF BEHIND ME." },
  { at: 0.64, text: "AVATAR, DIALOGUE, ARROW — ALL SHIPPED PARTS." },
  { at: 0.9, text: "NOTHING HERE IS CUSTOM. THAT'S THE POINT." },
];

/** how close to a waypoint before it speaks */
const REACH = 0.09;
/** ms of stillness before he faces front */
const IDLE_AFTER = 160;
const TYPE_MS = 26;
/* breathing room kept between the dialogue bubble and the edge of the stage */
const EDGE = 10;

const clamp = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

const reduced = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

function init(section: HTMLElement): void {
  const route = section.querySelector<SVGPathElement>("[data-route]");
  const ink = section.querySelector<SVGRectElement>("[data-ink]");
  const walker = section.querySelector<HTMLElement>("[data-walker]");
  const avatar = section.querySelector<HTMLElement>("[data-avatar]");
  const bubble = section.querySelector<HTMLElement>("[data-bubble]");
  const line = section.querySelector<HTMLElement>("[data-line]");
  if (!(route && ink && walker && avatar && bubble && line)) return;

  const length = route.getTotalLength();
  let previous = -1;
  let spoke = -1;
  let stillSince = 0;
  let queued = 0;
  let typing = 0;
  let stageX = 14;

  /* He can stand close enough to an edge that a bubble centred on him hangs off
     the stage and the line gets cut. Nudge it back inside; the tail keeps
     aiming at him. Runs on every scroll frame AND on every typed character,
     because the bubble grows as it types while nothing is scrolling. */
  const fit = (): void => {
    const field = walker.parentElement;
    if (!field) return;
    const span = field.clientWidth;
    const half = bubble.offsetWidth / 2;
    const centre = (stageX / 100) * span;
    const low = half + EDGE;
    const shift = Math.min(Math.max(centre, low), Math.max(span - low, low)) - centre;
    bubble.style.setProperty("--bubble-shift", `${Math.round(shift)}px`);
  };

  const say = (text: string): void => {
    window.clearInterval(typing);
    bubble.dataset.open = "true";
    if (reduced()) {
      line.textContent = text;
      fit();
      return;
    }
    let i = 0;
    typing = window.setInterval(() => {
      i += 1;
      line.textContent = text.slice(0, i) + (i < text.length ? "▌" : "");
      fit();
      if (i >= text.length) window.clearInterval(typing);
    }, TYPE_MS);
  };

  const draw = (): void => {
    queued = 0;
    const box = section.getBoundingClientRect();
    const travel = section.offsetHeight - window.innerHeight;
    const progress = travel > 0 ? clamp(-box.top / travel) : 0;

    // walk the SVG path itself, so the route curve and the character agree
    const point = route.getPointAtLength(progress * length);
    walker.style.setProperty("--walk-x", `${point.x}%`);
    walker.style.setProperty("--walk-y", `${point.y}%`);

    // the trail inks in behind him
    ink.setAttribute("height", String(clamp(progress + 0.02)));

    // facing follows scroll direction; stillness returns him to front
    const now = performance.now();
    const moved = Math.abs(progress - previous) > 0.0005;
    if (moved && previous >= 0) {
      avatar.setAttribute("row", progress > previous ? "0" : "1");
      avatar.removeAttribute("paused");
      stillSince = now;
    } else if (now - stillSince > IDLE_AFTER) {
      avatar.setAttribute("paused", "");
    }
    previous = progress;

    // nearest waypoint within reach does the talking
    let nearest = -1;
    for (let i = 0; i < WAYPOINTS.length; i += 1) {
      const wp = WAYPOINTS[i];
      if (wp && Math.abs(progress - wp.at) < REACH) nearest = i;
    }
    if (nearest !== spoke) {
      spoke = nearest;
      const wp = nearest >= 0 ? WAYPOINTS[nearest] : undefined;
      if (wp) say(wp.text);
      else {
        window.clearInterval(typing);
        bubble.dataset.open = "false";
      }
    }

    // the tail points back at him, so it flips once he crosses the middle
    bubble.classList.toggle("px-dialogue--right", point.x > 50);
    bubble.classList.toggle("px-dialogue--left", point.x <= 50);

    stageX = point.x;
    fit();
  };

  const schedule = (): void => {
    if (queued) return;
    queued = requestAnimationFrame(draw);
  };

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  draw();
}

const section = document.querySelector<HTMLElement>("[data-walk]");
if (section) init(section);
