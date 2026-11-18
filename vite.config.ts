import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works on GitHub Pages under any repo path.
  base: "./",
  build: {
    outDir: "dist",
    target: "es2022",
  },
});
