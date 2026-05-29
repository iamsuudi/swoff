# Configuration Reference

Full schema for `swoff.config.json` — every field, its type, default, and description.

## Quick reference

```json
{
  "$schema": "https://swoff.netlify.app/schema/v1.json",
  "enabled": true,
  "framework": "react",
  "build": {
    "outputDir": "dist",
    "swFilename": "sw"
  },
  "features": {
    "pwa": {
      "enabled": true,
      "preventDefaultInstall": false
    },
    "serviceWorker": {
      "version": {
        "enabled": true,
        "source": "from-package",
        "minSupportedVersion": "1.0.0"
      },
      "autoUpdate": true,
      "autoActivate": false,
      "defaultStrategy": "cache-first",
      "strategies": {
        "/api/*": { "strategy": "reactive", "staleTime": 30, "refetchOnFocus": true },
        "/static/*": "cache-first"
      },
      "cacheStrategy": "all",
      "clearRuntimeOnUpdate": false,
      "navigationPreload": true,
      "navigationMode": "spa",
      "spaEntry": "/index.html",
      "staleTime": 0,
      "refetchInterval": 0,
      "refetchOnReconnect": false,
      "refetchOnFocus": false,
      "refetchBatchSize": 5,
      "refetchBatchDelayMs": 1000,
      "refetchMaxRetries": 3,
      "refetchRetryDelayMs": 1000,
      "ignoreQueryParams": [],
      "normalizeCacheKey": false
    },
    "mutationQueue": {
      "enabled": false,
      "batchSize": 5,
      "batchDelayMs": 1000,
      "maxRetries": 3,
      "retryBackoffMs": 2000
    },
    "backgroundSync": false,
    "auth": {
      "enabled": false,
      "type": "bearer",
      "refreshPath": "/api/refresh",
      "userEndpoint": "/api/me"
    },
    "graphql": {
      "enabled": false,
      "endpoint": "/graphql"
    },
    "crossTabSync": true,
    "tagInvalidation": true,
    "pushNotifications": {
      "enabled": false,
      "vapidPublicKey": ""
    },
    "serverPush": {
      "enabled": false,
      "type": "sse",
      "endpoint": "/api/events",
      "reconnectDelayMs": 5000
    }
  }
}
```

---

## Top-level fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `$schema` | `string` | — | JSON Schema URL (for IDE autocomplete) |
| `enabled` | `boolean` | `true` | Master switch — disables all Swoff features |
| `framework` | `"react"` \| `"vue"` \| `"svelte"` \| `"vanilla"` | auto-detected | Your UI framework. Controls whether React hooks are generated. |
| `build.outputDir` | `string` | `"dist"` | Build tool output directory |
| `build.swFilename` | `string` | `"sw"` | Service worker filename prefix (e.g. `sw-v1.2.3.js`) |

---

## `features.serviceWorker`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `version.enabled` | `boolean` | `true` | Enable versioned SW filenames |
| `version.source` | `"from-package"` \| `"manual"` | `"from-package"` | Version source |
| `version.value` | `string` | — | Manual version (required if `source` is `"manual"`) |
| `version.minSupportedVersion` | `string` | `"0.0.0"` | Minimum supported SW version (for skip-waiting decisions) |
| `autoUpdate` | `boolean` | `true` | Automatically check for SW updates on page load |
| `autoActivate` | `boolean` | `false` | Skip the waiting phase and activate new SW immediately |
| `defaultStrategy` | `string` | `"cache-first"` | Default caching strategy (lowest priority in 3-tier resolution). One of: `cache-first`, `network-first`, `stale-while-revalidate`, `cache-only`, `network-only`, `reactive` |
| `strategies` | `object` | `{}` | Per-route strategy overrides. Keys are URL patterns (e.g. `/api/*`). Values can be a strategy name string or a `StrategyEntry` object |
| `cacheStrategy` | `"all"` \| `"explicit-only"` | `"all"` | When to apply caching strategies. `"all"`: every GET/HEAD request; `"explicit-only"`: only requests with `X-SW-Cache-Strategy` header |
| `clearRuntimeOnUpdate` | `boolean` | `false` | Clear runtime cache when a new SW version activates |
| `navigationPreload` | `boolean` | `true` | Enable Navigation Preload API — reduces SW startup latency |
| `navigationMode` | `"spa"` \| `"default"` | `"spa"` | SPA mode sends unmatched navigation requests to `spaEntry` |
| `spaEntry` | `string` | `"/index.html"` | Fallback HTML for SPA navigation requests |
| `staleTime` | `number` | `0` | Global default stale time in seconds. **Reactive-only** — only valid when `strategy` is `"reactive"`. Data is considered fresh for this long; after expiry, SW serves cached but triggers a background refresh. 0 = always stale. |
| `refetchInterval` | `number` | `0` | Global default auto-refetch interval in seconds. **Reactive-only**. SW periodically re-fetches matching routes in the background. 0 disables. |
| `refetchOnReconnect` | `boolean` | `false` | Global default for refetch on reconnect. **Reactive-only**. |
| `refetchOnFocus` | `boolean` | `false` | Global default for refetch on focus. **Reactive-only**. |
| `refetchBatchSize` | `number` | `5` | Max stale cache entries to refetch per batch in the background refresh queue |
| `refetchBatchDelayMs` | `number` | `1000` | Delay between batch cycles when processing stale refreshes (rate limiting) |
| `refetchMaxRetries` | `number` | `3` | Max retries for background refetches (exponential backoff) |
| `refetchRetryDelayMs` | `number` | `1000` | Base delay in ms for retry backoff (delay × 2^retryCount) |
| `ignoreQueryParams` | `string[]` | `[]` | Query params to strip from cache keys (e.g. `["_t", "utm_source"]`). Prevents cache-busting params from creating duplicate cache entries. |
| `normalizeCacheKey` | `boolean` | `false` | When `true`, query params are sorted alphabetically in cache keys so `?b=1&a=2` and `?a=2&b=1` resolve to the same entry. |

### `StrategyEntry` object

When a strategy value is an object instead of a string:

```json
"/api/*": {
  "strategy": "reactive",
  "staleTime": 30,
  "refetchOnFocus": true
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `strategy` | `string` | (required) | Caching strategy name. One of: `cache-first`, `network-first`, `stale-while-revalidate`, `cache-only`, `network-only`, `reactive` |
| `staleTime` | `number` | — | Stale time in seconds. **Reactive-only** — only valid when `strategy` is `"reactive"`. Data is considered fresh for this long; after expiry, SW serves cached but triggers a background refresh. 0 = always stale. |
| `refetchInterval` | `number` | — | Auto-refetch interval in seconds. **Reactive-only**. The SW periodically re-fetches this route in the background. 0 disables. |
| `refetchOnReconnect` | `boolean` | `false` | Refetch when the browser comes back online. **Reactive-only**. |
| `refetchOnFocus` | `boolean` | `false` | Refetch when the browser tab gains focus. **Reactive-only**. |

### 3-tier resolution

The following settings resolve in 3 tiers (highest to lowest priority):

1. **Per-request** — passed as options to `fetchWithCache({ strategy })` or `useCachedFetch()`, or via `X-SW-Strategy` / `X-SW-Stale-Time` / `X-SW-Refetch-Interval` / `X-SW-Refetch-On-Reconnect` / `X-SW-Refetch-On-Focus` headers
2. **Route pattern** — configured in `features.serviceWorker.strategies`
3. **Global default** — configured at `features.serviceWorker.defaultStrategy` (for `strategy`) or `features.serviceWorker.staleTime` / `features.serviceWorker.refetchInterval` / etc. (for reactive-only fields)

This applies to: `strategy`and reactive-only fields (`staleTime`, `refetchInterval`, `refetchOnReconnect`, `refetchOnFocus`).

---

## `features.mutationQueue`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable offline write queue |
| `batchSize` | `number` | `5` | Mutations per progress event |
| `batchDelayMs` | `number` | `1000` | Delay between mutations (rate limiting) |
| `maxRetries` | `number` | `3` | Max retries before dropping a mutation |
| `retryBackoffMs` | `number` | `2000` | Exponential backoff base (nextRetry = backoff × 2^retryCount) |

---

## `features.auth`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable auth module |
| `type` | `"bearer"` \| `"cookie"` \| `"custom"` | `"bearer"` | Auth strategy |
| `refreshPath` | `string` | `"/api/refresh"` | Token refresh endpoint |
| `userEndpoint` | `string` | `"/api/me"` | Current user fetch endpoint |

---

## `features.graphql`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Generate GraphQL wrapper (`queryGql` / `mutateGql`) |
| `endpoint` | `string` | `"/graphql"` | GraphQL endpoint URL |

---

## `features.pushNotifications`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Generate push notification subscription management |
| `vapidPublicKey` | `string` | `""` | VAPID public key (can also be passed at runtime to `subscribeToPush()`) |

---

## `features.serverPush`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable real-time cache invalidation via SSE or WebSocket |
| `type` | `"sse"` \| `"websocket"` | `"sse"` | Transport protocol |
| `endpoint` | `string` | `"/api/events"` | Push endpoint URL |
| `reconnectDelayMs` | `number` | `5000` | Initial reconnect delay on connection loss (exponential backoff, capped at 30s) |

---

## `features.tagInvalidation`

When set to `true`, uses defaults. When set to an object, supports:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable tag-based cache invalidation |
| `prefixes` | `string[]` | `["api","v1","v2","v3","rest","graphql","gql"]` | URL path prefixes to skip during tag generation |
| `patterns` | `object` | `{}` | Custom glob patterns for tag generation. Keys are URL patterns (`/api/:id`), values are tag template arrays (`["{id}"]`) |
| `singularization` | `object` | `{}` | Custom plural→singular mapping (e.g. `{"categories": "category"}`). Default: strips trailing `s`. |
| `cascading` | `object` | `{}` | Cascading tag dependencies. `{"todos": ["categories"]}` — invalidating `todos` also invalidates `categories` |
| `invalidation.debounceMs` | `number` | `0` | Debounce window for coalescing rapid invalidations |
| `invalidation.optimistic` | `boolean` | `false` | When true, immediately serve stale cache while invalidation is in flight |

---

## Boolean features

| Feature | Config path | Default |
|---------|-------------|---------|
| Background Sync | `features.backgroundSync` | `false` |
| Cross-tab Sync | `features.crossTabSync` | `true` |

---

## Feature dependencies

Some features work best together:

| Feature | Recommended combo | Why |
|---------|------------------|-----|
| `mutationQueue` | + `backgroundSync` | Background Sync processes mutations even after tab close |
| `tagInvalidation` | + `crossTabSync` | Invalidation events broadcast to all open tabs |
| `serverPush` | + `tagInvalidation` | Server push triggers `invalidateByTag()` — requires tag invalidation to function |
| `auth` + `mutationQueue` | — | `flushMutations()` after re-login replays mutations that failed with 401 |
| `graphql` | + `mutationQueue` + `tagInvalidation` | Offline GQL mutations queue in IndexedDB; mutations auto-invalidate operation-name tags |
