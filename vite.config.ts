import { defineConfig } from "vite";
import { resolve } from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [cloudflare()],
  base: "./",
  // L'app a deux pages : index.html (app) et view.html (page scan QR).
  // On scope les entrees au build CLIENT pour ne pas casser le build du Worker.
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: {
            main: resolve(__dirname, "index.html"),
            view: resolve(__dirname, "view.html"),
          },
        },
      },
    },
  },
});
