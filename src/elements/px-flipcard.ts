/**
 * <px-flipcard> — turns over to show its second face.
 *
 * The turn itself is CSS on the [flipped] attribute; this element only makes
 * it operable and announced, so the card still works with your own toggle.
 */

export class PxFlipcard extends HTMLElement {
  connectedCallback(): void {
    this.setAttribute("role", "button");
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;
    this.#announce();

    const aspect = this.getAttribute("aspect");
    if (aspect) this.style.setProperty("--px-flipcard-aspect", aspect);

    this.addEventListener("click", this.toggle);
    this.addEventListener("keydown", this.#onKey);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.toggle);
    this.removeEventListener("keydown", this.#onKey);
  }

  get flipped(): boolean {
    return this.hasAttribute("flipped");
  }

  set flipped(value: boolean) {
    this.toggleAttribute("flipped", value);
    this.#announce();
  }

  toggle = (): void => {
    this.flipped = !this.flipped;
    this.dispatchEvent(new CustomEvent("px-flip", { bubbles: true, detail: { flipped: this.flipped } }));
  };

  #onKey = (event: KeyboardEvent): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    this.toggle();
  };

  #announce(): void {
    this.setAttribute("aria-pressed", String(this.flipped));
    this.setAttribute("aria-label", this.getAttribute("label") ?? "Flip card");
  }
}
