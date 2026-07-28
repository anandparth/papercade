import { resolve } from "node:path";
import { defineConfig, type PluginOption } from "vite";

// site/index.html loads the built css via a plain <link>, which sits outside
// vite's module graph — so when `pnpm watch` rebuilds site/dist, nudge the
// browser to full-reload ourselves.
const reloadOnDistChange: PluginOption = {
  name: "papercade:reload-on-dist-change",
  configureServer(server) {
    server.watcher.add(resolve("site/dist"));
    server.watcher.on("change", (file) => {
      if (file.replaceAll("\\", "/").includes("site/dist/")) {
        server.ws.send({ type: "full-reload" });
      }
    });
  },
};

export default defineConfig({
  root: "site",
  server: { port: 5844, strictPort: true },
  plugins: [reloadOnDistChange],
});
