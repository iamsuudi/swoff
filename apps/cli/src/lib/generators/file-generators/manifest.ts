/**
 * Generates manifest.json - PWA web app manifest.
 */

import { GeneratorContext } from "./context.js";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export function generateManifest(ctx: GeneratorContext): void {
  const outputDir = join(ctx.projectRoot, "public");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const manifest = {
    name: "Swoff App",
    short_name: "Swoff",
    description: "Offline-first web application",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };

  writeFileSync(join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  ctx.generatedFiles.push("public/manifest.json");
}
