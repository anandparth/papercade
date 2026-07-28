// roughjs's bin/*.js files import each other without extensions, which Node's
// ESM resolver rejects — only the self-contained bundled entry runs in Node.
// The bundle ships no types, so borrow them from bin/ (type-only, erased).
declare module "roughjs/bundled/rough.esm.js" {
  import type { Config } from "roughjs/bin/core.js";
  import type { RoughGenerator } from "roughjs/bin/generator.js";

  const rough: { generator(config?: Config): RoughGenerator };
  export default rough;
}
