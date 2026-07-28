/**
 * <px-holo-card> — foil trading card.
 *
 * Reads the pointer, writes --px-holo-x / --px-holo-y (each -1 to 1) and lets
 * CSS do the tilt and the sheen. Pointer reads are coalesced into one frame,
 * so a fast cursor still costs a single style write per repaint.
 */

export class PxHoloCard extends HTMLElement {
  #frame = 0;
  #x = 0;
  #y = 0;

  connectedCallback(): void {
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;
    this.addEventListener("pointermove", this.#track);
    this.addEventListener("pointerleave", this.#reset);
    this.addEventListener("blur", this.#reset);
  }

  disconnectedCallback(): void {
    this.removeEventListener("pointermove", this.#track);
    this.removeEventListener("pointerleave", this.#reset);
    this.removeEventListener("blur", this.#reset);
    if (this.#frame) cancelAnimationFrame(this.#frame);
  }

  #track = (event: PointerEvent): void => {
    const rect = this.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // -1 at the left/top edge, 1 at the right/bottom
    this.#x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.#y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    this.#schedule();
  };

  #reset = (): void => {
    this.#x = 0;
    this.#y = 0;
    this.#schedule();
  };

  #schedule(): void {
    if (this.#frame) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      this.style.setProperty("--px-holo-x", this.#x.toFixed(3));
      this.style.setProperty("--px-holo-y", this.#y.toFixed(3));
    });
  }
}
