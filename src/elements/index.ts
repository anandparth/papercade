/**
 * papercade custom elements. Importing this file registers every element;
 * that is what the CDN <script type="module"> tag does.
 */
import { PxAvatar } from "./px-avatar.js";

export { PxAvatar };

const REGISTRY: ReadonlyArray<readonly [string, CustomElementConstructor]> = [["px-avatar", PxAvatar]];

if (typeof customElements !== "undefined") {
  for (const [tag, ctor] of REGISTRY) {
    if (!customElements.get(tag)) customElements.define(tag, ctor);
  }
}
