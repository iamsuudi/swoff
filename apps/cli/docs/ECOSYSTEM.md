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
| **Backend** | PHP, Laravel, Django, Rails, ASP.NET, Go, Java, Node | `navigation.mode: "network-first"` |
| **HTML-over-wire** | HTMX, Turbo Hotwire, Unpoly, Livewire | `navigation.mode: "network-first"` |
| **SSG** | Astro, Hugo, 11ty, Jekyll | `navigation.mode: "default"`, strategy `cache-first` |
| **SPA frameworks** | React, Vue, Svelte, Solid, Angular, Alpine | `navigation.mode: "spa"` (default) |
| **Meta-frameworks** | Next.js, Remix, Nuxt, SvelteKit, TanStack Start | Auto-detected; `navigation.mode: "network-first"` + framework-specific `ignoreQueryParams` |
| **RSC-based** | Next.js App Router | `navigation.mode: "network-first"` + `ignoreQueryParams: ["_rsc"]` (auto-detected) |
| **Edge / Serverless** | Cloudflare Workers, Deno Deploy, Vercel Edge | Edge runs on CDN, Swoff runs in browser — independent layers, no conflict |
| **Islands / Resumability** | Astro islands, Qwik, Marko | SW runs in its own thread regardless of component hydration |

## Navigation modes

Swoff supports four navigation modes for different rendering strategies:

| Mode | Behavior | Use case |
|---|---|---|
| `"spa"` | Serves `/index.html` from precache for all unmatched `navigate` requests (checked *before* network). | Traditional SPAs (React, Vue, Svelte SPA). |
| `"default"` | No special navigation handling. The SPA fallback is **not** served for navigations — the configured caching strategy handles all requests equally. | SSG sites (Astro, Hugo, 11ty) where pages are static files. |
| `"network-first"` | Navigation requests try network first, cache the response on success, and fall back to runtime cache → precache → SPA fallback on failure. Non-navigation requests (API, RSC fetches, assets) use the configured strategy normally. | Any SSR/MPA framework (Next.js, Remix, Nuxt, SvelteKit, Laravel, Django, PHP, HTMX). |
| `"stale-while-revalidate"` | Serves cached HTML instantly if available, then fetches a fresh version in the background. On cache miss, tries network, then falls through the offline chain. | Previously-visited SSR pages where instant loading matters more than absolute freshness. |

## Per-route navigation policies

Beyond the global mode, Swoff supports **per-route navigation policies** via `navigation.rules`. Each rule has a `match` glob pattern and a `policy`:

```jsonc
{
  "features": {
    "serviceWorker": {
      "navigation": {
        "mode": "network-first",
        "rules": [
          { "match": "/", "policy": "cache-first" },
          { "match": "/about", "policy": "cache-first" },
          { "match": "/blog/*", "policy": "network-first", "offlineFallback": "/blog-offline.html" },
          { "match": "/dashboard/**", "policy": "network-only" },
          { "match": "/notes/**", "policy": "stale-while-revalidate" }
        ]
      }
    }
  }
}
```

| Policy | Behavior |
|---|---|
| `cache-first` | Serve from precache immediately. Never fetches. Ideal for SSG pages. |
| `network-first` | Try network → cache on success → fallback chain. Standard SSR mode. |
| `network-only` | Always fetch from network. Never caches. For dynamic pages. |
| `stale-while-revalidate` | Serve cached HTML instantly, fetch fresh in background, update cache. |

Rules are evaluated in order; the first match wins. Per-route `offlineFallback` paths are automatically precached at install time.

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
        "mode": "network-first"
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

## React Server Components (RSC)

Next.js App Router uses RSC as its transport format: client-side navigation fetches serialised component trees via `fetch()` with a unique `?_rsc=<token>` query parameter. This token is ephemeral — it changes on every navigation for deduplication, not for cache busting.

**Impact on caching:**

- Every client navigation produces a different URL: `/about?_rsc=abc` vs `/about?_rsc=xyz`
- The request is `mode: ""` (not `"navigate"`), so SPA fallback does not serve cached HTML
- Each RSC response is a `text/x-component` payload — NOT an HTML page. It's a serialised component tree that only the React client can interpret.

**Why `ignoreQueryParams: ["_rsc"]` is NOT used:**

Setting `ignoreQueryParams: ["_rsc"]` would map both RSC fetches (`/about?_rsc=abc`) and full page loads (`/about`) to the same cache key `/about`. But they are **completely different resources**:

| Request | Content | Serves as |
|---|---|---|
| RSC fetch `/about?_rsc=abc` | `text/x-component` (component tree) | Client-side navigation (SPA) |
| Full page load `/about` | `text/html` (full page) | Page refresh / initial load |

If the RSC payload were cached at `/about`, a full page refresh offline would find it and return `text/x-component` to the browser — which can't render it as a page. Therefore, the SW includes a safety check: **for navigation requests, only cached HTML responses are served**.

**Recommended configuration (auto-applied when Next.js is detected):**

```jsonc
{
  "features": {
    "serviceWorker": {
      "strategy": {
        "default": "network-first",
        "patterns": {
          "/_next/*": "cache-first",
          "/api/*": "network-first"
        }
      },
      "navigation": {
        "mode": "network-first",
        "precacheRoutes": ["/", "/about"]
      }
    }
  }
}
```

**How offline navigation works:**

| Scenario | Behavior |
|---|---|
| Client navigation to visited page | React's in-memory RSC cache handles this (not SW). Works offline if page was previously visited in the same session. |
| Refresh visited page (online) | `navigateFirst` fetches fresh HTML from network, caches at clean URL, returns it |
| Refresh visited page (offline) | `navigateFirst` looks up `/about` in runtime cache → **hit** if previously full-loaded online; otherwise fall through cache |
| Refresh but never full-loaded (only client-nav) | Runtime cache has no HTML entry for `/about` (only RSC payloads) → cache miss → 503 |
| First visit to SSG route (offline) | Works if route is in `precacheRoutes` — fetched at install time |
| Navigate to new page (offline) | Network error → no RSC cache → React shows error state |

**Limitations:**

- Pages that have never been full-loaded (only visited via client navigation) cannot be refreshed offline — the RSC payload cached by the SW at its full URL cannot serve as an HTML page
- Dynamic pages (SSR-only) require a successful full page load to cache their HTML
- Use `navigation.precacheRoutes` for SSG routes that should work offline immediately on first visit
- React's in-memory RSC cache is per-session; navigating away and coming back via client nav works within the same session, but a fresh tab or refresh requires the SW or network

## Offline Fallback Page

When the SW can't satisfy a navigation request (no cache, no network), it **never** lets the browser show its own "This site can't be reached" error. Instead, it falls back through this chain:

1. **Per-route offline page** — serve the route-specific offline page from precache if a `NavigationRule` with `offlineFallback` matched
2. **Global offline page** — serve the user's `navigation.offlineFallback` from precache
3. **SPA shell** — serve `/index.html` from precache (client-side router can take over)
4. **Inline 503 HTML** — a minimal built-in page saying "You're offline"

The browser always receives a valid HTML response with `Content-Type: text/html`, preventing the native browser error page from kicking in.

**Configuration:**

```jsonc
{
  "features": {
    "serviceWorker": {
      "navigation": {
        "offlineFallback": "/offline.html"
      }
    }
  }
}
```

When set, the path is precached at install time so it's always available. Build your `/offline.html` to guide users back online — for example with connection status, retry button, or links to previously visited pages.

Without this config, the SW still serves the inline 503 HTML page (step 3), so the user is never thrown to a browser error.

## Why it matters

- **TanStack Query / SWR** — in-memory state only; no SW integration, no offline writes, no push
- **Workbox** — SW only; no data fetching, auth, or framework hooks
- **Apollo Client** — GraphQL only; no SW caching
- **TanStack DB** — forces dual database management (client SQLite + server DB) with schema coupling and privacy concerns: all data persists in client-side SQLite indefinitely, including after logout. Requires schema definitions, SQLite WASM download (~800 kB), and a sync engine — effectively a distributed database system in the browser. Swoff uses the native Cache Storage API: no schemas, no WASM, no dual-DB sync, and auth data is wiped on logout.
- **Next.js / Remix** — full meta-frameworks dictating your entire architecture

Swoff is the only tool that combines SW caching, data fetching, offline writes, auth, real-time sync, and push into a single config-driven system — all framework-agnostic at the core, with optional reactive hooks per framework. It operates at the lowest possible layer (the `fetch` event), making it simpler, smaller, and more composable than any application-layer alternative.
