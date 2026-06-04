/**
 * Generates GUIDE.md — points user to online documentation and PWA asset info.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateGuide(ctx: GeneratorContext): void {
  const lines: string[] = [];
  const w = (s: string) => lines.push(s);

  w("# Swoff — Generated Files");
  w("");
  w(
    "Your project was generated with Swoff. All generated files live in `swoff/`.",
  );
  w("");

  if (ctx.config.features.pwa.enabled) {
    w("## PWA Assets");
    w("");
    w("Generate PWA icons, splash screens, favicons, OG image, and manifest.json with:");
    w("");
    w("  npx @swoff/assets --source ./logo.svg");
    w("");
    w("### What gets generated");
    w("");
    w("- PWA icons: 64×64, 192×192, 512×512, maskable 512×512");
    w("- Apple touch icon: 180×180");
    w("- Apple splash screens: all device resolutions");
    w("- Favicon: ICO (16×16, 32×32, 48×48)");
    w("- OG image: 1200×630 (also used for Twitter card)");
    w("- manifest.json (with icons array, theme/background color, screenshot)");
    w("");
    w("After generation, reference these assets in your HTML <head>. The tool prints the exact <link> and <meta> tags to copy-paste.");
    w("");
  }

  w("For the full documentation, visit:");
  w("");
  w("- **Documentation** — https://swoff.dev/docs");
  w("");
  w("- **CLI Reference** — `swoff generate`, `swoff validate`, etc. See [CLI.md](./CLI.md)");
  w("");

  writeFile(ctx, "GUIDE.md", lines.join("\n"));
}
