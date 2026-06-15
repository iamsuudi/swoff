# Data Fetching & Caching (replaces TanStack Query)

> **If you're coming from TanStack Query:** `fetchWithCache` is Swoff's equivalent of `useQuery` — it returns `{ response, fromCache }` instead of `{ data, isLoading }`. The key difference: caching happens in the Service Worker, not in JavaScript memory. Cached responses survive hard navigation, tab close, and full page reload. No provider wrapper needed. See the [full comparison](../comparisons/data-fetching.md).

## Preconditions

- Swoff initialized (`swoff init` or `swoff add pwa` done)
- Service worker registered and controlling the page

## Status

**Already on by default.** After `swoff init`, the generated SW applies these default patterns:

| Pattern     | Strategy        | Behavior                               |
| ----------- | --------------- | -------------------------------------- |
| `/api/*`    | `network-first` | Try network, fall back to cache        |
| `/static/*` | `cache-first`   | Serve from cache, update in background |

The SW handles all `fetch` events — no manual route registration needed.

## Generated files

| File                   | What it does                                   | Import in your code?                  |
| ---------------------- | ---------------------------------------------- | ------------------------------------- |
| `swoff/fetch/core.ts`  | `fetchWithCache()`, `prefetchCache()`          | Yes — main API                        |
| `swoff/fetch/state.ts` | `getFetchCount()` — in-flight request counter  | Yes, for loading spinners             |
| `swoff/cache/index.ts` | `invalidateByTag()`, `invalidateByTags()`      | Yes, for manual invalidation          |
| `swoff/config.ts`      | `API_BASE` — base URL for relative fetch paths | Edit if your API is on another origin |

## Usage

```ts
import { fetchWithCache, prefetchCache } from "./swoff/fetch/core";
import { getFetchCount } from "./swoff/fetch/state";

// Fetch — cached in SW, survives hard nav
const { response, fromCache } = await fetchWithCache("/api/notes");
const notes = await response.json();

// fromCache === true means the SW served a cached response
// The SW will still refresh it in the background (network-first)

// Optional: per-request strategy override
const { response } = await fetchWithCache("/api/notes", {
  strategy: "stale-while-revalidate",
  staleTime: 30, // seconds — serve cache, refresh after 30s
  refetchInterval: 60, // seconds — poll every 60s even without navigation
  refetchOnFocus: true, // refresh when tab regains focus
  refetchOnReconnect: true, // refresh when network returns
  signal: AbortSignal.timeout(5000),
});

// Prefetch — fire-and-forget cache warm
prefetchCache("/api/notes/123");

// Check if anything is fetching (for global loading indicator)
const fetching = getFetchCount() > 0;
```

## Customize

No generated files to edit for basic setup. All caching behavior is configured through `swoff.config.json`.

## Config

```json
{
  "features": {
    "requestBatchWindowMs": 50,
    "serviceWorker": {
      "strategy": {
        "default": "cache-first",
        "timeout": 10,
        "patterns": {
          "/api/*": {
            "strategy": "reactive",
            "staleTime": 30,
            "refetchOnFocus": true
          },
          "/static/*": "cache-first"
        },
        "reactive": {
          "defaults": {
            "staleTime": 0,
            "refetchInterval": 0,
            "refetchOnReconnect": false,
            "refetchOnFocus": false
          }
        },
        "maxRuntimeCacheAge": 2592000,
        "normalizeKey": false,
        "ignoreQueryParams": [],
        "clearRuntimeOnUpdate": false
      }
    }
  }
}
```

### Strategies

| Strategy                 | Behavior                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `cache-first`            | Serve from cache. Fetch in background to update.                                                     |
| `network-first`          | Try network. Fall back to cache on timeout or offline.                                               |
| `stale-while-revalidate` | Serve stale cache immediately. Fetch fresh in background.                                            |
| `cache-only`             | Serve from cache only. Never fetch.                                                                  |
| `network-only`           | Always fetch. Never cache.                                                                           |
| `reactive`               | Like stale-while-revalidate but with staleTime, refetchInterval, refetchOnFocus, refetchOnReconnect. |

### Strategy patterns

URL patterns are glob-style (`*` matches any segment, `**` matches any depth). Each pattern can be a strategy name string or an object with per-route overrides for `timeout`, `staleTime`, `refetchInterval`, `refetchOnFocus`, `refetchOnReconnect`.

## Related

- [Navigation caching: SPA/SSR modes, preloading, fallback](./03-navigation-caching.md)
- [Tag-based cache invalidation](./05-tag-invalidation.md)
- [Config reference: strategy patterns](../CONFIG.md#featuresserviceworkerstrategy)
