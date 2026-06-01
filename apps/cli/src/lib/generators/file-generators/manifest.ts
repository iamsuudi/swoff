/**
 * Generates manifest.json - PWA web app manifest.
 * Reads icon paths from config if assets were generated, otherwise uses defaults.
 */

import { GeneratorContext, ensureDir } from "./context.js";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";

export function generateManifest(ctx: GeneratorContext): void {
  const outputDir = join(ctx.projectRoot, "public");
  ensureDir(outputDir);

  const manifestPath = join(outputDir, "manifest.json");
  if (existsSync(manifestPath)) return;

  const pwaAssets = ctx.config.features.pwa.assets;
  const hasGeneratedSplash = pwaAssets.source && pwaAssets.generated;

  const manifest: Record<string, unknown> = {
    name: "Swoff App",
    short_name: "Swoff",
    description: "Offline-first web application",
    start_url: "/",
    display: "standalone",
    background_color: pwaAssets.bgColor || "#ffffff",
    theme_color: pwaAssets.themeColor || "#000000",
    orientation: "portrait-primary",
    scope: "/",
    lang: "en-US",
    categories: ["utilities", "web"],
    prefer_related_applications: false,
    display_override: ["window-controls-overlay", "standalone", "browser"],
    icons: [
      { src: "/icon-64.png", sizes: "64x64", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/maskable-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [],
  };

  if (hasGeneratedSplash) {
    manifest.screenshots = [
      { src: "/og-image.png", sizes: "1200x630", type: "image/png", form_factor: "narrow", label: "App screenshot" },
    ];
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  ctx.generatedFiles.push("public/manifest.json");
}
