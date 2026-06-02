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

  if (ctx.config.features.pwa.enabled && ctx.config.features.pwa.assets.source) {
    w("## PWA Assets");
    w("");
    w("PWA assets (icons, favicon, OG image, splash screens) will be generated from your");
    w(` source logo during \`swoff generate\`.`);
    w("");
    w("To regenerate manually:");
    w("");
    w("  swoff assets --source <path>");
    w("");
    w("### What gets generated");
    w("");
    w("- PWA icons: 64×64, 192×192, 512×512, maskable 512×512");
    w("- Apple touch icon: 180×180");
    w("- Apple splash screens: all device resolutions");
    w("- Favicon: SVG + ICO (16×16, 32×32, 48×48)");
    w("- OG image: 1200×630 (also used for Twitter card)");
    w("");
    w("After generation, reference these assets in your app manually. Run \`swoff assets\` for a copy-paste guide with the exact <link> and <meta> tags.");
    w("");
    w("### Source logo requirements");
    w("");
    w("- **SVG** recommended — produces the best quality at all sizes");
    w("- PNG or JPG accepted — will be upscaled if needed");
    w("- Minimum 512×512 for crisp icons");
    w("- Transparent backgrounds work well with theme colors");
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
