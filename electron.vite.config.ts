import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

function copyPdfWorker() {
  return {
    name: "copy-pdf-worker",
    closeBundle() {
      const src = path.resolve(
        __dirname,
        "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      );
      const dest = path.resolve(__dirname, "out/main/chunks/pdf.worker.mjs");
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    },
  };
}

export default defineConfig({
  main: {
    plugins: [copyPdfWorker()],
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, "electron/main/index.ts"),
        },
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, "electron/preload/index.ts"),
        },
      },
    },
  },
  renderer: {
    root: ".",
    base: "./",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [react()],
    build: {
      outDir: "dist-electron",
      rollupOptions: {
        input: path.resolve(__dirname, "index.html"),
      },
    },
  },
});
