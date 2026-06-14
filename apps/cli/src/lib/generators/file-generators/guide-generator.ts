/**
 * Generates GUIDE.md — points user to online documentation and PWA asset info.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateGuide(ctx: GeneratorContext): void {
  const lines: string[] = [];
  const w = (s: string) => lines.push(s);
  const ext = ctx.ext;
  const auth = ctx.config.features.auth;

  w("# Swoff — Generated Files");
  w("");
  w(
    "Your project was generated with Swoff. All generated files live in `swoff/`.",
  );
  w("");

  if (auth.enabled) {
    w(`## Auth (${auth.type})`);
    w("");
    w("Edit `swoff/auth/adapter.${ext}` to match your backend:");
    w("");
    w("- `toAuthData()`: map your login/register response to `AuthData`");
    w("- `getHeaders()`: return auth headers for fetch requests");
    w("- `fetchUser()`: implement fetching current user from `/api/me`");
    if (auth.type !== "cookie") {
      w("- `refresh()`: implement token/session refresh");
    }
    w("");
    w("Use `{ auth: true }` in `fetchWithCache()` for authenticated requests:");
    w("");
    w("```ts");
    w('import { fetchWithCache } from "./swoff/fetch/core.${ext}";');
    w('const data = await fetchWithCache("/api/me", { auth: true }).then(r => r.json());');
    w("```");
    w("");
    w("Call `clearAuth()` from `swoff/auth/store.${ext}` on logout: memory, IndexedDB, and runtime caches are cleaned. Cross-tab sync happens automatically via the service worker.");
    w("");
  }

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
