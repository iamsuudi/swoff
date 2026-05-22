/**
 * Generates manifest.json - PWA web app manifest.
 */

import { GeneratorContext } from "./context.js";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";

export function generateManifest(ctx: GeneratorContext): void {
  const outputDir = join(ctx.projectRoot, "public");
  if (!existsSync(outputDir)) return;

  const manifestPath = join(outputDir, "manifest.json");
  if (existsSync(manifestPath)) return;

  const manifest = {
    name: "Swoff App",
    short_name: "Swoff",
    description: "Offline-first web application",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    orientation: "portrait-primary",
    scope: "/",
    lang: "en-US",
    categories: ["utilities", "web"],
    prefer_related_applications: false,
    display_override: ["window-controls-overlay", "standalone", "browser"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
    screenshots: [],
  };

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  ctx.generatedFiles.push("public/manifest.json");
}
