import { resolve } from "node:path";
import { defineConfig, type PluginOption } from "vite";

const DIST = resolve("dist");

// site/dist is a link to the build output (see scripts/build.ts), so vite
// serves it normally. It sits outside vite's module graph though — it arrives
// through a plain <link>/<script> — so nudge the browser when it changes.
const reloadOnBuild: PluginOption = {
  name: "papercade:reload-on-build",
  configureServer(server) {
    server.watcher.add(DIST);
    server.watcher.on("change", (file) => {
      if (file.startsWith(DIST)) server.ws.send({ type: "full-reload" });
    });
  },
};

export default defineConfig({
  root: "site",
  server: {
    port: 5844,
    strictPort: true,
    // the link resolves to the repo root, which is outside vite's root
    fs: { allow: [resolve(".")] },
  },
  plugins: [reloadOnBuild],
});
