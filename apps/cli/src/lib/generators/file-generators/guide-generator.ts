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
    if (ctx.hasBundler) {
      w("Edit `swoff/auth/adapter." + ext + "` to match your backend:");
      w("");
      w("- `getHeaders()`: return auth headers for fetch requests");
      w("- `fetchUser()`: implement fetching current user from `/api/me`");
      if (auth.type !== "cookie") {
        w("- `refresh()`: implement token/session refresh");
      }
      w("");
      w("Use `{ auth: true }` in `fetchWithCache()` for authenticated requests:");
      w("");
      w("```ts");
      w("import { fetchWithCache } from \"./swoff/fetch/core." + ext + "\";");
      w('const data = await fetchWithCache("/api/me", { auth: true }).then(r => r.json());');
      w("```");
      w("");
      w("Call `clearAuth()` from `swoff/auth/store." + ext + "` on logout: memory, IndexedDB, and runtime caches are cleaned. Cross-tab sync happens automatically via the service worker.");
    } else {
      w("Auth is handled by the bundled script. The SW intercepts 401 responses and co-ordinates auth state across tabs.");
      w("");
      w("To configure the auth adapter, edit `swoff/auth/adapter." + ext + "`:");
      w("");
      w("- `getHeaders()`: return auth headers for fetch requests");
      w("- `fetchUser()`: implement fetching current user from `/api/me`");
      if (auth.type !== "cookie") {
        w("- `refresh()`: implement token/session refresh");
      }
    }
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

  w("## Integration Guides");
  w("");
  w("Walk through features step by step in [/docs/guides/](./docs/guides/README.md):");
  w("");
  w("- [PWA foundation](./docs/guides/01-pwa.md) — SW generation, install prompt, versioning");
  w("- [Data fetching & caching](./docs/guides/02-data-fetching.md) — fetchWithCache, 6 strategies");
  w("- [Navigation caching](./docs/guides/03-navigation-caching.md) — SPA/SSR navigation, preload, fallback");
  w("- [Auth](./docs/guides/04-auth.md) — auth headers, 401 detection, token refresh");
  w("- [Tag invalidation](./docs/guides/05-tag-invalidation.md) — auto-tags, glob, cascading, cross-tab");
  w("- [GraphQL](./docs/guides/06-graphql.md) — body-hash caching, operation-name auto-tags");
  w("- [Offline mutations](./docs/guides/07-offline-mutations.md) — queue writes offline, background sync");
  w("- [Push notifications](./docs/guides/08-push.md) — subscribe, notify, unsubscribe");
  w("- [Server push](./docs/guides/09-server-push.md) — SSE/WS from SW, live tag invalidation");
  w("");
  w("For the full reference documentation, visit:");
  w("");
  w("- **Documentation** — https://swoff.dev/docs");
  w("");
  w("- **CLI Reference** — `swoff generate`, `swoff validate`, etc. See [CLI.md](./CLI.md)");
  w("");

  writeFile(ctx, "GUIDE.md", lines.join("\n"));
}
