# Offline Navigation: Swoff vs next-pwa / @serwist/next / Workbox / vite-plugin-pwa

When a user navigates offline, the browser shows "This site can't be reached" unless the Service Worker intercepts the navigation and serves a fallback. Every SW library solves this, but they differ in how configurable the fallback chain is, how tightly they couple to a framework, and whether they guarantee a valid HTML response in every failure scenario.

## How Swoff does it

Swoff treats navigation as a distinct request class with its own configurable mode, fallback chain, and Content-Type safety checks.

**Navigation modes** (set via `navigation.mode`):

| Mode              | Use case               | Behavior                                                                                  |
| ----------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| `"spa"`           | Single-page apps       | Intercepts `request.mode === "navigate"` → `fromSpaFallback` (serves `/index.html` shell) |
| `"network-first"` | SSR / SSG / MPA        | `navigateFirst` tries network → caches on success → falls through to cache chain          |
| `"default"`       | No SPA fallback needed | Navigation requests go through normal strategy dispatch unmodified                        |

**Ultimate fallback chain** (generated as `fromUltimateFallback` in the SW):

```
navigateFirst (or applyStrategy catch)
  → fromRuntime (Content-Type must start with "text/html")
  → fromPrecache (url.search = "")
  → fromOfflineFallback (user-provided /offline.html)
  → fromSpaShell (/index.html from precache)
  → inline 503 HTML page (guaranteed text/html response)
```

Each step checks existence before proceeding. The last step — an inline `new Response(...)` with status 503 — prevents the browser from ever showing its native error page.

**Generated code, zero deps:**

```js
async function fromUltimateFallback(request) {
  const offline = await fromOfflineFallback();
  if (offline) return offline;

  const cache = await caches.open(CACHE_NAME);
  const shell = await cache.match("/index.html");
  if (shell) return shell;

  return new Response(`<!DOCTYPE html><html lang="en">...</html>`, {
    status: 503,
    headers: { "Content-Type": "text/html" },
  });
}
```

**Config-driven setup** — set two fields in `swoff.config.json`:

```jsonc
{
  "features": {
    "serviceWorker": {
      "navigation": {
        "mode": "network-first",
        "offlineFallback": "/offline.html",
        "precacheRoutes": ["/", "/about", "/notes/new"],
      },
    },
  },
}
```

**Content-Type safety** — `fromRuntime` checks `response.headers.get("Content-Type")` for navigation requests and rejects anything that isn't `text/html`. This prevents RSC payloads (`text/x-component`), API JSON, or any non-HTML cached response from being served as a page.

**Framework detection** — `swoff init` auto-detects Next.js, Remix, Astro, Nuxt, and SvelteKit, applying framework-appropriate defaults (e.g., `network-first` for SSR frameworks, `spa` for client-rendered React/Vue/Svelte).

## How competitors handle it

**next-pwa:** Creates a `NavigationRoute` via Workbox and auto-detects a `pages/_offline.js` page as the navigation fallback. The `_offline` page is built as a static HTML page by Next.js and served from the SW cache when the network fails. Handles the core case — prevents the browser error — but only works with Next.js Pages Router. App Router support is community-driven and unreliable. Navigation behavior is not configurable beyond the `_offline` convention. Relies on Workbox's runtime (~30 kB).

```js
// next.config.js
const withPWA = require("next-pwa")({ dest: "public" });
module.exports = withPWA({
  /* next config */
});
// pages/_offline.js — auto-detected
```

**@serwist/next:** Requires manual configuration in both `next.config.ts` and a custom `app/sw.ts` file. The offline fallback is set via `fallbacks.entries` with a matcher function. More powerful than next-pwa — supports App Router, navigation preload, and per-strategy fallbacks. However, setup is 10-15 lines across two files, and the fallback page path must be added to both `additionalPrecacheEntries` and `fallbacks.entries` manually. Recommended by Next.js documentation for App Router PWA support. Also relies on Serwist core (~35 kB).

```ts
// next.config.ts
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/offline", revision: "1" }],
});

// app/sw.ts
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.mode === "navigate",
      },
    ],
  },
});
serwist.addEventListeners();
```

**Workbox:** Framework-agnostic at the webpack level. Uses `navigateFallback` option on `GenerateSW` or `NavigationRoute` in `InjectManifest` mode. Supports `navigateFallbackAllowlist`/`Denylist` for route exclusion. Has a `setCatchHandler()` for custom fallback logic. Single `navigateFallback` value — no per-route fallbacks without custom code. The `NetworkFirst` strategy falls back to cache silently (no throw), so to get a fallback page you must use `navigateFallback` at the plugin level or wrap the strategy.

```js
// webpack.config.js
new GenerateSW({
  navigateFallback: "/offline.html",
  navigateFallbackAllowlist: [/^(?!\/api)/],
});
```

**vite-plugin-pwa:** Wraps Workbox with Vite-specific conveniences. Offline fallback uses Workbox's `navigateFallback` under the hood. For SPAs, `navigateFallback: "/index.html"` is the default pattern. For SSR frameworks, point to a static offline HTML page. Has meta-framework integrations (`@vite-pwa/nuxt`, `@vite-pwa/sveltekit`, `@vite-pwa/astro`, `@vite-pwa/remix`) but no Next.js integration. All navigation behavior inherits from Workbox — single fallback, no content-type safety, no per-route precaching.

```ts
// vite.config.ts
VitePWA({
  workbox: {
    navigateFallback: "/offline.html",
    navigateFallbackAllowlist: [/^(?!\/__)/],
  },
});
```

## Comparison table

| Feature                              | Swoff                                                       | next-pwa                    | @serwist/next                      | Workbox                            | vite-plugin-pwa              |
| ------------------------------------ | ----------------------------------------------------------- | --------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------- |
| **Offline fallback config**          | ✅ `offlineFallback` in config                              | ✅ `_offline` convention    | 🟡 Manual in 2 files               | ✅ `navigateFallback` option       | ✅ `navigateFallback` option |
| **Ultimate fallback chain**          | ✅ 6-step (cache → precache → offline → shell → inline 503) | ❌ Single fallback          | ❌ Single fallback                 | ❌ Single fallback                 | ❌ Single fallback           |
| **Inline 503 guarantee**             | ✅ Last resort inline HTML                                  | ❌                          | ❌                                 | ❌                                 | ❌                           |
| **Content-Type safety on navigate**  | ✅ Rejects non-HTML (RSC, JSON)                             | ❌                          | ❌                                 | ❌                                 | ❌                           |
| **Nav-only mode (network-first)**    | ✅ Explicit nav mode                                        | 🟡 Via Workbox NetworkFirst | 🟡 Via Serwist config              | 🟡 Via NavigationRoute             | 🟡 Via NavigationRoute       |
| **SPA mode (app shell)**             | ✅ `fromSpaFallback`                                        | ❌ (SSR only)               | ❌ (SSR only)                      | ✅ Via `navigateFallback`          | ✅ Via `navigateFallback`    |
| **Route precaching (SSR/SSG)**       | ✅ `precacheRoutes` list                                    | ❌                          | 🟡 `additionalPrecacheEntries`     | 🟡 Via `additionalManifestEntries` | ❌                           |
| **Framework-agnostic**               | ✅ Any framework                                            | ❌ Next.js only             | 🟡 Next.js first, core is agnostic | ✅ Any build tool                  | 🟡 Vite ecosystem            |
| **Next.js App Router**               | ✅ Supported                                                | ❌ Pages only               | ✅ Full support                    | ❌ Manual webpack                  | ❌ No Next.js support        |
| **Next.js Pages Router**             | ✅ Supported                                                | ✅ Full support             | ✅ Supported                       | ❌ Manual webpack                  | ❌ No Next.js support        |
| **Remix / Astro / Nuxt / SvelteKit** | ✅ Auto-detected + presets                                  | ❌                          | 🟡 SvelteKit via serwist           | ❌ Manual config                   | 🟡 Per-framework plugins     |
| **Zero runtime deps**                | ✅ Generated code only                                      | ❌ Workbox ~30 kB           | ❌ Serwist ~35 kB                  | ❌ Workbox ~30 kB                  | ❌ Workbox ~30 kB            |
| **Navigation preload**               | ✅ Config flag                                              | ✅ Via Workbox              | ✅ Via Serwist                     | ✅ Plugin option                   | ✅ Plugin option             |
| **Config-driven**                    | ✅ Single JSON                                              | 🟡 next.config.js wrap      | 🟡 next.config + sw.ts             | 🟡 Webpack plugin config           | 🟡 vite.config.ts            |
| **Setup lines**                      | 2 (config fields)                                           | 3 (plugin + \_offline page) | 10-15 (2 files)                    | 10-20 (webpack + SW code)          | 3-5 (vite plugin)            |
