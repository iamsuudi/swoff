# Navigation Caching

How Swoff handles page navigation — what happens when a user clicks a link or types a URL.

## Preconditions

- Service worker registered and controlling the page

## Status

**Already on by default.** After `swoff init`, navigation mode is `"spa"` with preload enabled.

## How it works

Navigation requests go through the **same strategy pipeline** as any other fetch (see [Caching Strategies](./02-caching-strategy.md)). The strategy — cache-first, network-first, or whichever — is determined by URL pattern matching, not by whether the request is a navigation.

Each strategy has its own decision tree (see [How each strategy decides](./02-caching-strategy.md#how-each-strategy-decides)). Some check the cache first, some hit the network first, and some always refresh in the background. Within that tree, two functions are navigation-aware:

1. **`serveFromCache()`** — called when the strategy decides to check the cache. Whether a request is a navigation (`isNavRequest`) matters here. The navigation mode (`NAV_MODE`) determines what counts as a cache hit for navigation requests.
2. **`fallback()`** — called when the strategy can't produce a response at all (network failed, cache empty). This uses **`NAV_MODE`** (not `isNavRequest`) to decide which caches and fallback levels to try.

The mode (`spa`, `ssr`, `default`) controls both functions, but with different logic in each.

## serveFromCache

Called when the strategy decides to check the cache first. Inside, it checks `isNavRequest` (`request.mode === "navigate"`). If the request is a navigation, the cache lookup follows the current mode:

| Mode | Navigation request | Non-navigation request (JS, CSS, API) |
|---|---|---|
| `spa` | Returns null (cache bypass) — only exception is the precached fallback path (e.g., `/index.html`). | Checks runtime cache, then precache (type-gated). |
| `ssr` | Checks precache first, then runtime-html cache. | Same as spa. |
| `default` | Same as ssr. | Same as spa. |

In **SPA mode**, navigation requests bypass the cache entirely. Every navigation goes to the network, where the strategy (typically network-first) fetches the app shell. This is correct for SPAs — the client router needs to run before it can determine the route.

In **SSR and default modes**, previously cached HTML pages can be served from the runtime-html cache, so server-rendered routes work offline on repeat visits.

## Fallback chain

When the strategy can't produce a response at all (network failed and cache was empty), `fallback()` runs. It does **not** check `isNavRequest` — it uses `NAV_MODE` directly to determine the fallback chain:

```
1.  precache (exact URL match)
2.  runtime-html cache (ssr/default only)
3.  per-route fallback from navigation.rules (if configured)
4.  global fallback path (ssr/default only)
5.  inline 503 page
```

SPA mode skips steps 2 and 4 — it goes directly from precache to per-route rules to 503.

## Navigation modes

| Mode | serveFromCache for navs | Fallback chain | When to use |
|---|---|---|---|
| `"spa"` | Returns null (cache bypass). Only precached fallback path serves. | Skips runtime-html and global fallback. | Single-page apps (React, Vue, Svelte). Client router handles routing. |
| `"ssr"` | Checks precache → runtime-html. | Full chain (all 5 levels). | Server-rendered apps (Next.js pages, Laravel, Rails). Repeat visits can serve cached HTML. |
| `"default"` | Same as ssr. | Full chain (all 5 levels). | Static sites or mixed content. |

## Config reference

```json
{
  "features": {
    "serviceWorker": {
      "navigation": {
        "mode": "spa",
        "preload": true,
        "fallback": "/offline",
        "precacheRoutes": [],
        "rules": []
      }
    }
  }
}
```

### mode

`"spa"`, `"ssr"`, or `"default"`. Controls serveFromCache and fallback behavior as described above.

### preload

When `true`, the SW enables Navigation Preload during activation. On the next navigation, the browser starts the network request in parallel with SW startup. The SW races the preload response against a short timeout (half the fetch timeout). If the preload wins, it's used as the primary response and cached. This shaves off one round-trip time on the first navigation after activation.

Set to `false` if you don't want the SW to preload navigations.

### fallback

The URL path of an HTML page to serve as the offline fallback. What happens with it depends on mode:

- **SPA mode**: If `serveFromCache()` finds this path in precache, it serves it for any navigation request. This is the typical SPA offline pattern — serve the app shell and let the client router show an offline message.
- **SSR/default mode**: Used only in `fallback()` after everything else has been tried.

Empty string means no fallback (browser shows its own offline page).

### precacheRoutes

URL paths to fetch and cache during SW install, so they work offline from the first visit:

```json
"precacheRoutes": ["/", "/about", "/offline"]
```

These are stored in the precache (`CACHE_NAME`) and are checked by `serveFromCache` for SSR/default nav requests and by `fallback()` in all modes.

### rules

Per-route fallback paths, checked only inside `fallback()`:

```json
"rules": [
  { "match": "/blog/**", "fallback": "/offline-blog" },
  { "match": "/admin/*", "fallback": "/login" }
]
```

When a navigation request to `/blog/post-123` fails (offline + no cache), `matchRouteFallback` matches the URL against each rule's glob pattern and returns the corresponding `fallback` path from precache. Rules are checked after precache and runtime-html but before the global fallback path.

They do **not** affect normal cached operation — they only apply when the network and cache both fail to produce a response.

## React adapters

Swoff generates these hooks for navigation and network awareness (import from `./swoff/adapters`):

```tsx
import { useNetworkStatus } from "./swoff/adapters/useNetworkStatus";
import { useOfflineAnalytics } from "./swoff/adapters/useOfflineAnalytics";

function App() {
  const { online, wasOffline, effectiveType, retry } = useNetworkStatus();
  const { lastEvent, events } = useOfflineAnalytics();

  return (
    <div>
      {!online && <Banner>Offline — showing cached content</Banner>}
      {wasOffline && online && <Toast>Back online!</Toast>}
      <div>Connection: {effectiveType}</div>
      {events.length > 0 && <p>Offline fallback shown {events.length} times</p>}
    </div>
  );
}
```

- `useNetworkStatus` — reactive online/offline state, connection type, and a `retry` callback.
- `useOfflineAnalytics` — tracks when the SW serves offline fallback pages. Events are broadcast by the SW via the `swoff:offline-fallback` custom event.

## Related

- [Caching strategies: patterns, timeout, reactive](./02-caching-strategy.md)
- [Data fetching: fetchWithCache, prefetchCache](./03-data-fetching.md)
- [Config reference: navigation](../CONFIG.md#featuresserviceworkernavigation)
