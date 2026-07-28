import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { defineConfig, type PluginOption } from "vite";

const DIST = resolve("dist");
const MIME: Record<string, string> = {
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};

// site/index.html loads the real build output through a plain <link>, which is
// outside vite's module graph. Serve dist/ straight from disk (no copy, no
// caching) and full-reload the page whenever `pnpm watch` rewrites it.
const serveDist: PluginOption = {
  name: "papercade:serve-dist",
  configureServer(server) {
    server.watcher.add(DIST);
    server.watcher.on("change", (file) => {
      if (file.startsWith(DIST)) server.ws.send({ type: "full-reload" });
    });

    server.middlewares.use("/dist", (req, res, next) => {
      const file = join(DIST, (req.url ?? "").split("?")[0] ?? "");
      if (!file.startsWith(DIST) || !existsSync(file) || !statSync(file).isFile()) return next();
      res.setHeader("Content-Type", MIME[extname(file)] ?? "application/octet-stream");
      res.setHeader("Cache-Control", "no-store");
      createReadStream(file).pipe(res);
    });
  },
};

export default defineConfig({
  root: "site",
  server: { port: 5844, strictPort: true },
  plugins: [serveDist],
});
