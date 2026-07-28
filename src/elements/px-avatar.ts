/**
 * <px-avatar> — sprite-sheet mascot, bring your own character.
 *
 * Playback lives in CSS (see components/avatar.css); this element only
 * validates attributes and maps them onto the custom properties that drive it.
 * Light DOM on purpose: page CSS styles it like any other papercade component.
 *
 * <px-avatar src="hero.webp" frames="6" rows="2" row="1" fps="10" alt="Hero"></px-avatar>
 */

interface NumericAttr {
  readonly prop: string;
  readonly min: number;
}

/** attribute name -> the custom property it feeds, and its lowest sane value */
const NUMERIC: Record<string, NumericAttr> = {
  frames: { prop: "--px-avatar-frames", min: 1 },
  rows: { prop: "--px-avatar-rows", min: 1 },
  row: { prop: "--px-avatar-row", min: 0 },
  fps: { prop: "--px-avatar-fps", min: 1 },
};

/** attribute name -> the custom property it feeds, as a CSS length */
const LENGTH: Record<string, string> = {
  width: "--px-avatar-w",
  height: "--px-avatar-h",
};

export class PxAvatar extends HTMLElement {
  static readonly observedAttributes: readonly string[] = [
    "src",
    "alt",
    ...Object.keys(NUMERIC),
    ...Object.keys(LENGTH),
  ];

  connectedCallback(): void {
    this.#sync();
  }

  attributeChangedCallback(): void {
    this.#sync();
  }

  /** Resume the walk cycle. */
  play(): void {
    this.removeAttribute("paused");
  }

  /** Hold the first frame — the idle pose. */
  pause(): void {
    this.setAttribute("paused", "");
  }

  get playing(): boolean {
    return !this.hasAttribute("paused");
  }

  #sync(): void {
    const src = this.getAttribute("src");
    this.#set("--px-avatar-src", src ? `url("${CSS.escape(src)}")` : null);

    for (const [attr, { prop, min }] of Object.entries(NUMERIC)) {
      const raw = Number.parseInt(this.getAttribute(attr) ?? "", 10);
      this.#set(prop, Number.isFinite(raw) && raw >= min ? String(raw) : null);
    }

    for (const [attr, prop] of Object.entries(LENGTH)) {
      const raw = this.getAttribute(attr);
      this.#set(prop, raw ? (/^\d+$/.test(raw) ? `${raw}px` : raw) : null);
    }

    // a decorative mascot should not be announced; a meaningful one should
    const alt = this.getAttribute("alt");
    if (alt) {
      this.setAttribute("role", "img");
      this.setAttribute("aria-label", alt);
      this.removeAttribute("aria-hidden");
    } else {
      this.setAttribute("aria-hidden", "true");
      this.removeAttribute("role");
      this.removeAttribute("aria-label");
    }
  }

  #set(prop: string, value: string | null): void {
    if (value === null) this.style.removeProperty(prop);
    else this.style.setProperty(prop, value);
  }
}
