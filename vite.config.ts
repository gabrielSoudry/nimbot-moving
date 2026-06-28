import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [],
  server: {
    host: true,
  },
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        view: resolve(__dirname, "view.html"),
      },
    },
  },
});
