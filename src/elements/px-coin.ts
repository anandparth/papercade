/**
 * <px-coin> — a collectible coin.
 *
 * Click (or Enter/Space) to bank its value in the shared wallet: the coin
 * flips away, a +N floats off, and every `[data-px-coins]` readout updates.
 *
 * <px-coin value="5" sound sticky label="Bonus coin"></px-coin>
 */
import { coins } from "./wallet.js";

/** Deliberately NOT the famous two-note game chime — a fourth, E5 to A5. */
const BLIP: readonly [number, number] = [659.25, 880];

let audio: AudioContext | undefined;

function blip(): void {
  const Ctor = window.AudioContext;
  if (!Ctor) return;
  const ctx = (audio ??= new Ctor());
  const now = ctx.currentTime;
  BLIP.forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const at = now + i * 0.08;
    osc.type = "square";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.05, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + (i === 0 ? 0.09 : 0.32));
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.4);
  });
}

export class PxCoin extends HTMLElement {
  connectedCallback(): void {
    this.setAttribute("role", "button");
    this.setAttribute("aria-label", this.getAttribute("label") ?? "Collect coin");
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;
    this.addEventListener("click", this.#collect);
    this.addEventListener("keydown", this.#onKey);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.#collect);
    this.removeEventListener("keydown", this.#onKey);
  }

  get value(): number {
    const raw = Number.parseInt(this.getAttribute("value") ?? "", 10);
    return Number.isFinite(raw) ? raw : 1;
  }

  #onKey = (event: KeyboardEvent): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    this.#collect();
  };

  #collect = (): void => {
    if (this.hasAttribute("collected")) return;

    const total = coins.add(this.value);
    if (this.hasAttribute("sound")) blip();

    this.#fly("px-coin-pop");
    this.#fly("px-coin-plus", `+${this.value}`);

    if (!this.hasAttribute("sticky")) {
      this.setAttribute("collected", "");
      this.setAttribute("aria-disabled", "true");
      this.tabIndex = -1;
    }

    this.dispatchEvent(
      new CustomEvent("px-collect", { bubbles: true, detail: { value: this.value, total } })
    );
  };

  /** Spawn a throwaway child that removes itself once its animation ends. */
  #fly(className: string, text?: string): void {
    const el = document.createElement("span");
    el.className = className;
    if (text) el.textContent = text;
    el.addEventListener("animationend", () => el.remove(), { once: true });
    this.append(el);
  }
}
