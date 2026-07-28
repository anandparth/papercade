/**
 * papercade custom elements. Importing this file registers every element;
 * that is what the CDN <script type="module"> tag does.
 */
import { PxAvatar } from "./px-avatar.js";
import { PxCoin } from "./px-coin.js";
import { PxFlipcard } from "./px-flipcard.js";
import { PxHoloCard } from "./px-holo-card.js";
import { coins } from "./wallet.js";

export { PxAvatar, PxCoin, PxFlipcard, PxHoloCard, coins };

const REGISTRY: ReadonlyArray<readonly [string, CustomElementConstructor]> = [
  ["px-avatar", PxAvatar],
  ["px-coin", PxCoin],
  ["px-flipcard", PxFlipcard],
  ["px-holo-card", PxHoloCard],
];

if (typeof customElements !== "undefined") {
  for (const [tag, ctor] of REGISTRY) {
    if (!customElements.get(tag)) customElements.define(tag, ctor);
  }
}
