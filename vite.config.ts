import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { getBrand } from "./shared/brand";

// Brand: index.html marken-bewusst (lang/title/description aus brand.ts, build-time via VITE_BRAND).
// Crawler/Link-Previews holen HTML OHNE JS -> muss build-time stehen, nicht zur Laufzeit. Ersetzt die
// Tags strukturell (nicht text-exakt) -> der statische Fallback im index.html (Angelus/DE) bleibt robust.
const brandHtmlPlugin = {
  name: "brand-index-html",
  transformIndexHtml(html: string) {
    const b = getBrand();
    return html
      .replace(/<html lang="[^"]*">/, () => `<html lang="${b.htmlLang}">`)
      .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${b.htmlTitle}</title>`)
      .replace(/<meta name="description" content="[^"]*"\s*\/?>/, () => `<meta name="description" content="${b.htmlDescription}" />`);
  },
};

const plugins = [react(), tailwindcss(), brandHtmlPlugin];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    watch: {
      usePolling: false,
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/.next/**",
        "**/build/**",
      ],
    },
  },
});
