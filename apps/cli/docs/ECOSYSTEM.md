# Ecosystem Compatibility

Swoff operates at the **`fetch` event** + **Service Worker** layer — below the application and data-fetching layers. This makes it compatible with any web stack regardless of backend language, frontend framework, or rendering strategy.

```
Application Layer (React, Vue, Svelte, HTMX, vanilla)
  Data Fetching Layer (TanStack Query, SWR, Apollo, fetch())
    SWOFF — SW + Client (fetch interception, cache, offline)
      Browser APIs (Cache Storage, IndexedDB, fetch, push)
```

The only framework-specific surface is **view adapters** (React hooks, future Vue/Svelte). These are optional thin wrappers over `postMessage` to the SW. The core caching, offline, invalidation, and auth work without them.

## Compatible with everything

| Category | Examples | Config Hint |
|---|---|---|
| **Backend** | PHP, Laravel, Django, Rails, ASP.NET, Go, Java, Node | `navigation.mode: "ssr"` |
| **HTML-over-wire** | HTMX, Turbo Hotwire, Unpoly, Livewire | `navigation.mode: "ssr"` |
| **SSG** | Astro, Hugo, 11ty, Jekyll | `navigation.mode: "default"`, strategy `cache-first` |
| **SPA frameworks** | React, Vue, Svelte, Solid, Angular, Alpine | `navigation.mode: "spa"` (default) |
| **Meta-frameworks** | Next.js, Remix, Nuxt, SvelteKit, TanStack Start | Auto-detected; `navigation.mode: "ssr"` + framework-specific `ignoreQueryParams` |
| **RSC-based** | Next.js App Router | `navigation.mode: "ssr"` + `ignoreQueryParams: ["_rsc"]` (auto-detected) |
| **Edge / Serverless** | Cloudflare Workers, Deno Deploy, Vercel Edge | Edge runs on CDN, Swoff runs in browser — independent layers, no conflict |
| **Islands / Resumability** | Astro islands, Qwik, Marko | SW runs in its own thread regardless of component hydration |

## Navigation modes

Swoff supports three navigation modes for different rendering strategies:

| Mode | Behavior | Use case |
|---|---|---|
| `"spa"` | Runtime serves global fallback directly from precache (no runtime HTML caching for navigation). | Traditional SPAs (React, Vue, Svelte SPA). |
| `"default"` | No special navigation handling. The configured caching strategy handles all requests equally. | SSG sites (Astro, Hugo, 11ty) where pages are static files. |
| `"ssr"` | Runtime checks HTML cache → per-route fallback → global fallback. Adds auto-prefetch: intercepts `history.pushState`/`replaceState` to call `prefetchCache(url)` on every client-side navigation, warming the SW cache with HTML pages as the user browses. | Framework-agnostic SSR — all meta-frameworks (Next.js, Remix, Nuxt, SvelteKit, TanStack Start, Astro, HTMX). |

## Per-route fallback rules

Beyond the global fallback, `navigation.rules` provide per-route offline fallback pages. Each rule has a `match` glob pattern and an optional `fallback` path:

```jsonc
{
  "features": {
    "serviceWorker": {
      "navigation": {
        "mode": "ssr",
        "rules": [
          { "match": "/blog/*", "fallback": "/blog-offline.html" },
          { "match": "/dashboard/**", "fallback": "/dashboard-offline.html" }
        ]
      }
    }
  }
}
```

Rules only provide per-route fallback paths for the ultimate fallback chain — they do not override the caching strategy. Per-route `fallback` paths are automatically precached at install time. Rules are evaluated in order; the first match wins.

## Smart navigation retry

When a navigation falls through to the ultimate offline fallback, Swoff can start a **background retry loop**:

```jsonc
{
  "features": {
    "serviceWorker": {
      "navigation": {
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

On each retry, the SW fetches the failed URL. When a retry succeeds, the response is cached and a `swoff:navigation-online` custom event is dispatched so the app can auto-reload or show a "back online" toast. This eliminates the "found connectivity but need to manually refresh" problem.

Retries run in the background via `event.waitUntil` — they don't block the current response.

When `swoff init` detects a meta-framework in `package.json`, it automatically sets the correct `navigation.mode` and framework-specific `ignoreQueryParams`.

For example, a Next.js project gets:
```jsonc
{
  "framework": "nextjs",
  "features": {
    "serviceWorker": {
      "strategy": {
        "default": "network-first",
        "ignoreQueryParams": ["_rsc"],
        "patterns": {
          "/_next/*": "cache-first",
          "/api/*": "network-first"
        }
      },
      "navigation": {
        "mode": "ssr"
      }
    }
  },
  "build": {
    "outputDir": "public"
  }
}
```

You can override any of these defaults in your config — no framework lock-in.

## Route precaching

For SSG routes or any deterministic URL, you can precache routes at install time:

```jsonc
{
  "features": {
    "serviceWorker": {
      "navigation": {
        "precacheRoutes": ["/", "/about", "/blog/*"]
      }
    }
  }
}
```

The SW fetches each route during installation and stores it in the precache cache. Routes already covered by scanned assets are deduplicated. This is framework-agnostic — works with SSG pages, API responses, or any fetchable URL. If a route fails to fetch during installation (e.g. server is down), the SW logs a warning and continues.

## HTML cache isolation

A single URL can serve different content types depending on the request. For example, a Next.js App Router page returns `text/html` on full page load and `text/x-component` (RSC) on client navigation. HTMX can return partial HTML fragments. Any API endpoint can return JSON or HTML depending on the `Accept` header.

If these different content types were stored at the same cache key, a hard refresh while offline could serve the wrong response to the browser.

Swoff isolates `text/html` responses in their own cache container (`CACHE_NAME_RUNTIME_HTML`), separate from all other content. The rule is simple and framework-agnostic:

- `text/html` → HTML cache
- Everything else (RSC, JSON, JS, CSS, images) → main runtime cache

Navigation requests only read from the HTML cache. Non-navigation requests only read from the main runtime cache. This is always-on with no user-facing config.

**Impact on Next.js / TanStack Start (RSC):**

The `?_rsc=<token>` query param used by RSC frameworks is now safe to strip via `ignoreQueryParams: ["_rsc"]`. RSC payloads and HTML pages for the same URL are stored in different caches — they never collide.

**How offline navigation works:**

| Scenario | Behavior |
|---|---|
| Client navigation to visited page | React's in-memory RSC cache handles this (not SW). Works offline if page was previously visited in the same session. |
| Refresh visited page (online) | Strategy dispatch fetches fresh HTML from network, caches in HTML cache, returns it |
| Refresh visited page (offline) | Strategy dispatch looks up `/about` in HTML cache → **hit** if previously full-loaded online; otherwise fall through |
| Refresh but never full-loaded (only client-nav) | HTML cache has no entry for `/about` (RSC payload stored in main cache) → cache miss → 503 |
| First visit to SSG route (offline) | Works if route is in `precacheRoutes` — fetched at install time |
| Navigate to new page (offline) | Network error → main cache serves RSC/data payload if previously cached |

**Limitations:**

- Pages that have never been full-loaded (only visited via client navigation) cannot be refreshed offline — the RSC payload in the main cache cannot serve as an HTML page
- Dynamic pages (SSR-only) require a successful full page load to cache their HTML
- React's in-memory RSC cache is per-session; a fresh tab or refresh requires the SW or network

## Offline Fallback Page

When the SW can't satisfy a navigation request (no cache, no network), it **never** lets the browser show its own "This site can't be reached" error. Instead, it falls back through this chain:

1. **Per-route fallback** — serve the route-specific fallback from precache if a `NavigationRule` with `fallback` matched
2. **Global fallback (`FALLBACK_PATH`)** — serve the user's `navigation.fallback` from precache (e.g. `/offline.html` for SSR, `/index.html` for SPA)
3. **Inline 503 HTML** — a minimal built-in page saying "You're offline"

The browser always receives a valid HTML response with `Content-Type: text/html`, preventing the native browser error page from kicking in.

**Configuration:**

```jsonc
{
  "features": {
    "serviceWorker": {
      "navigation": {
        "fallback": "/offline.html"
      }
    }
  }
}
```

When set, the path is precached at install time so it's always available. Build your `/offline.html` to guide users back online — for example with connection status, retry button, or links to previously visited pages.

Without this config, the SW still serves the inline 503 HTML page, so the user is never thrown to a browser error.

## Why it matters

- **TanStack Query / SWR** — in-memory state only; no SW integration, no offline writes, no push
- **Workbox** — SW only; no data fetching, auth, or framework hooks
- **Apollo Client** — GraphQL only; no SW caching
- **TanStack DB** — forces dual database management (client SQLite + server DB) with schema coupling and privacy concerns: all data persists in client-side SQLite indefinitely, including after logout. Requires schema definitions, SQLite WASM download (~800 kB), and a sync engine — effectively a distributed database system in the browser. Swoff uses the native Cache Storage API: no schemas, no WASM, no dual-DB sync, and auth data is wiped on logout.
- **Next.js / Remix** — full meta-frameworks dictating your entire architecture

Swoff is the only tool that combines SW caching, data fetching, offline writes, auth, real-time sync, and push into a single config-driven system — all framework-agnostic at the core, with optional reactive hooks per framework. It operates at the lowest possible layer (the `fetch` event), making it simpler, smaller, and more composable than any application-layer alternative.
