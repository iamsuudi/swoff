# Offline Navigation: Swoff vs next-pwa / @serwist/next / Workbox / vite-plugin-pwa

When a user navigates offline, the browser shows "This site can't be reached" unless the Service Worker intercepts the navigation and serves a fallback. Every SW library solves this, but Swoff is the only one with three navigation modes, a configurable multi-step fallback chain, HTML cache isolation that prevents Content-Type corruption, auto-prefetch on client-side navigation, per-route policies, and smart background retry — all without coupling to any specific framework.

## How Swoff does it

**Three navigation modes** (set via `navigation.mode`):

| Mode | Behavior | Use case |
|---|---|---|
| `"spa"` | Runtime serves global fallback directly from precache (no runtime HTML caching for navigation). Default fallback: `"/index.html"`. | Traditional SPAs |
| `"default"` | No special nav handling — strategies handle all requests equally | SSG sites |
| `"ssr"` | Runtime checks HTML cache → per-route fallback → global fallback. Auto-prefetch on `pushState`/`replaceState` | All meta-frameworks (Next.js, Remix, Nuxt, SvelteKit, TanStack Start, Astro, HTMX) |

**Auto-prefetch (SSR mode only):** When `navigation.mode` is `"ssr"`, the generated `client-injector` intercepts `history.pushState()` and `history.replaceState()` — the underlying API every client-side router uses — and calls `prefetchCache(url)` for each navigation. This warms the SW cache with HTML pages as the user browses, so refreshes and return visits load instantly.

```js
// Generated automatically when navMode === "ssr"
const origPushState = history.pushState.bind(history);
history.pushState = function (data, unused, url) {
  origPushState(data, unused, url);
  if (typeof url === "string" && url.startsWith("/")) {
    prefetchCache(url);
  }
};
```

**HTML cache isolation:** Swoff stores HTML responses in their own cache container (`CACHE_NAME_RUNTIME_HTML`), separate from all other content (JSON, RSC payloads, JS, CSS, images). Navigation requests only read from the HTML cache; non-navigation requests read from the main runtime cache. This completely eliminates the risk of serving a non-HTML response (e.g. RSC `text/x-component`, JSON, partial HTML) during a hard refresh — without any framework-specific logic.

**Ultimate fallback chain** (generated as `fromUltimateFallback` in the SW):

```
applyStrategy catch (or navigateWithRules fallthrough)
  → startRetryLoop (for navigation requests — background retry)
  → fromRuntime (HTML cache only — non-SPA navigate, else global fallback)
  → routeFallback (per-route fallback from navigation rules)
  → globalFallback (FALLBACK_PATH from precache)
  → inline 503 HTML page (guaranteed text/html response)
```

Each step checks existence before proceeding. The last step — an inline `new Response(...)` with status 503 — prevents the browser from ever showing its native error page.

**Per-route navigation policies:** Beyond the global navigation mode, `navigation.rules` lets you configure per-path policies:

```jsonc
"navigation": {
  "mode": "network-first",
  "rules": [
    { "match": "/", "policy": "cache-first" },
    { "match": "/about", "policy": "cache-first" },
    { "match": "/blog/*", "policy": "network-first", "fallback": "/blog-offline.html" },
    { "match": "/dashboard/**", "policy": "network-only" },
  ]
}
```

Each rule has its own fallback page that is automatically precached at install time.

**Smart navigation retry:** When a navigation falls through to the inline 503, the SW starts a background retry loop:

```jsonc
"navigation": {
  "retry": {
    "enabled": true,
    "intervalMs": 3000,
    "maxRetries": 20
  }
}
```

On each retry, the SW fetches the failed URL. When a retry succeeds, the response is cached and a `swoff:navigation-online` custom event is dispatched so the app can auto-reload or show a "back online" toast.

**Config-driven setup** — set fields in `swoff.config.json`:

```jsonc
{
  "features": {
    "serviceWorker": {
      "navigation": {
        "mode": "ssr",
        "fallback": "/offline.html",
        "precacheRoutes": ["/", "/about"],
        "rules": [
          { "match": "/", "policy": "cache-first" }
        ],
        "retry": {
          "enabled": true,
          "intervalMs": 3000,
          "maxRetries": 20
        }
      }
    }
  }
}
```

**Framework detection** — `swoff init` auto-detects Next.js, Remix, Astro, Nuxt, and SvelteKit, applying framework-appropriate defaults (`mode: "ssr"`, `ignoreQueryParams`, strategy patterns).

## How competitors handle it

**next-pwa:** Creates a `NavigationRoute` via Workbox and auto-detects a `pages/_offline.js` page as the navigation fallback. Works only with Next.js Pages Router — App Router support is unreliable. Navigation behavior is not configurable beyond the `_offline` convention. No HTML cache isolation: caching an RSC payload at a navigation URL corrupts the cache. No auto-prefetch, no per-route policies, no retry.

```js
// next.config.js
const withPWA = require("next-pwa")({ dest: "public" });
module.exports = withPWA({ /* next config */ });
// pages/_offline.js — auto-detected
```

**@serwist/next:** Requires manual configuration in both `next.config.ts` and a custom `app/sw.ts`. Supports App Router, navigation preload, and per-strategy fallbacks. However, setup is 10-15 lines across two files, and the fallback page path must be added to both `additionalPrecacheEntries` and `fallbacks.entries` manually. No HTML cache isolation — RSC payloads and HTML share the same cache slot. No auto-prefetch, no pushState interceptor. No per-route policies — fallbacks are matched by function, not config. No smart retry.

```ts
// app/sw.ts
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [{ url: "/offline", matcher: ({ request }) => request.mode === "navigate" }],
  },
});
serwist.addEventListeners();
```

**Workbox:** Framework-agnostic. Uses `navigateFallback` option on `GenerateSW` or `NavigationRoute` in `InjectManifest` mode. Supports `navigateFallbackAllowlist`/`Denylist`. Single `navigateFallback` value — no per-route fallbacks without custom code. No HTML cache isolation — a fetch to the same URL with different Accept headers overwrites the cache entry. No auto-prefetch. No retry.

```js
// webpack.config.js
new GenerateSW({
  navigateFallback: "/offline.html",
  navigateFallbackAllowlist: [/^(?!\/api)/],
});
```

**vite-plugin-pwa:** Wraps Workbox with Vite conveniences. For SPAs, `navigateFallback: "/index.html"` is the default. For SSR frameworks, point to a static offline page. All navigation behavior inherits from Workbox — single fallback, no HTML isolation, no auto-prefetch, no retry. Has meta-framework integrations (`@vite-pwa/nuxt`, `@vite-pwa/sveltekit`, `@vite-pwa/astro`, `@vite-pwa/remix`) but no Next.js integration.

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

| Feature | Swoff | next-pwa | @serwist/next | Workbox | vite-plugin-pwa |
|---|---|---|---|---|---|
| **Navigation modes** | ✅ 3 (spa, default, ssr) | 🟡 1 (Pages Router) | 🟡 1 (network-first) | 🟡 1 (navigateFallback) | 🟡 1 (navigateFallback) |
| **SSR mode** | ✅ `"ssr"` with auto-prefetch | ❌ | ❌ | ❌ | ❌ |
| **Auto-prefetch on pushState** | ✅ Built-in | ❌ | ❌ | ❌ | ❌ |
| **HTML cache isolation** | ✅ Content-Type routing | ❌ | ❌ | ❌ | ❌ |
| **Ultimate fallback chain** | ✅ 6-step (includes retry) | ❌ Single | ❌ Single | ❌ Single | ❌ Single |
| **Inline 503 guarantee** | ✅ Last resort HTML | ❌ | ❌ | ❌ | ❌ |
| **Per-route policies** | ✅ Config rules | ❌ | ❌ | ❌ | ❌ |
| **Per-route offline fallback** | ✅ Rule-level config | ❌ | 🟡 Per matcher function | ❌ | ❌ |
| **Smart retry loop** | ✅ Configurable | ❌ | ❌ | ❌ | ❌ |
| **Offline fallback path** | ✅ Config field | ✅ `_offline` convention | 🟡 Manual in 2 files | ✅ navigateFallback | ✅ navigateFallback |
| **Route precaching (SSG)** | ✅ precacheRoutes | ❌ | 🟡 additionalPrecacheEntries | 🟡 additionalManifestEntries | ❌ |
| **Navigation preload** | ✅ Flag | ✅ Via Workbox | ✅ | ✅ Plugin | ✅ Plugin |
| **Framework-agnostic** | ✅ Any | ❌ Next.js only | 🟡 Next.js first | ✅ Any | 🟡 Vite ecosystem |
| **Next.js App Router** | ✅ Full | ❌ Pages only | ✅ | ❌ | ❌ |
| **Remix / Astro / Nuxt / SvelteKit** | ✅ Auto-detected | ❌ | 🟡 SvelteKit via serwist | ❌ | 🟡 Per plugin |
| **Zero runtime deps** | ✅ Generated code | ❌ Workbox ~30 kB | ❌ Serwist ~35 kB | ❌ Workbox ~30 kB | ❌ Workbox ~35 kB |
| **Config-driven** | ✅ Single JSON | 🟡 next.config.js | 🟡 next.config + sw.ts | 🟡 Webpack config | 🟡 vite.config.ts |
| **Setup lines** | 2 (config fields) | 3 | 10-15 (2 files) | 10-20 | 3-5 |

## When to choose what

- **Choose Swoff when:** You need offline navigation for any SSR framework (Next.js, Remix, Nuxt, SvelteKit, Astro, HTMX), want auto-prefetch that works without manual `<Link prefetch>` attributes, need HTML cache isolation to prevent RSC/JSON content corruption on hard refresh, or want per-route policies and smart retry out of the box.
- **Choose next-pwa when:** You're locked into Next.js Pages Router, need only basic offline fallback, and prefer a minimal plugin setup (though the project is largely unmaintained).
- **Choose @serwist/next when:** You need Next.js App Router offline support and are willing to manage a two-file configuration. Accept that RSC payloads and HTML share the same cache slot, which may cause issues on hard refresh.
- **Choose Workbox when:** You need a framework-agnostic SW toolkit and the complexity of manually writing and maintaining your SW configuration is acceptable. You don't need HTML isolation, auto-prefetch, per-route policies, or retry.
- **Choose vite-plugin-pwa when:** You're in the Vite ecosystem and need one-plugin setup with basic offline fallback. You don't need SSR-specific features or Next.js support.
