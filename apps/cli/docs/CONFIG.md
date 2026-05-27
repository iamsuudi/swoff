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
        "/api/*": { "strategy": "network-first", "staleTime": 30 },
        "/static/*": "cache-first"
      },
      "cacheStrategy": "all",
      "staleTime": 60,
      "maxCacheEntries": 100,
      "maxCacheAge": 86400000,
      "runtimeCacheName": "swoff-runtime",
      "clearRuntimeOnUpdate": false,
      "navigationPreload": true,
      "navigationMode": "spa",
      "spaEntry": "/index.html",
      "refetchOnWindowFocus": true,
      "refetchOnReconnect": true,
      "refetchInterval": 0
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
| `defaultStrategy` | `string` | `"cache-first"` | Default caching strategy (lowest priority in 3-tier resolution). One of: `cache-first`, `network-first`, `stale-while-revalidate`, `cache-only`, `network-only` |
| `strategies` | `object` | `{}` | Per-route strategy overrides. Keys are URL patterns (e.g. `/api/*`). Values can be a strategy name string or a `StrategyEntry` object |
| `cacheStrategy` | `"all"` \| `"explicit-only"` | `"all"` | When to apply caching strategies. `"all"`: every GET/HEAD request; `"explicit-only"`: only requests with `X-SW-Cache-Strategy` header |
| `staleTime` | `number` | `0` | Global stale time in seconds. Data is considered fresh for this long; after expiry, SW serves cached but triggers a background refresh. 0 = no staleTime (immediately stale). |
| `maxCacheEntries` | `number` | — | Max entries in runtime cache (0 or undefined = unlimited). Oldest entries evicted first. |
| `maxCacheAge` | `number` | — | Max age of cache entries in ms (0 or undefined = no limit) |
| `runtimeCacheName` | `string` | `"swoff-runtime"` | Name of the runtime cache in the Cache Storage API |
| `clearRuntimeOnUpdate` | `boolean` | `false` | Clear runtime cache when a new SW version activates |
| `navigationPreload` | `boolean` | `true` | Enable Navigation Preload API — reduces SW startup latency |
| `navigationMode` | `"spa"` \| `"default"` | `"spa"` | SPA mode sends unmatched navigation requests to `spaEntry` |
| `spaEntry` | `string` | `"/index.html"` | Fallback HTML for SPA navigation requests |
| `refetchOnWindowFocus` | `boolean` | `false` | Auto-refetch stale data when the user returns to the tab (hook-level) |
| `refetchOnReconnect` | `boolean` | `false` | Auto-refetch stale data when the browser comes back online (hook-level) |
| `refetchInterval` | `number` | `0` | Poll interval in seconds for auto-refetching stale data (0 = disabled) |

### `StrategyEntry` object

When a strategy value is an object instead of a string:

```json
"/api/*": {
  "strategy": "network-first",
  "maxCacheEntries": 50,
  "maxCacheAge": 3600000,
  "staleTime": 30
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `strategy` | `string` | (required) | Caching strategy name |
| `maxCacheEntries` | `number` | inherited from top-level | Per-route max cache entries |
| `maxCacheAge` | `number` | inherited from top-level | Per-route max cache age in ms |
| `staleTime` | `number` | inherited from top-level | Per-route stale time in seconds |

### 3-tier resolution

The following settings resolve in 3 tiers (highest to lowest priority):

1. **Per-request** — passed as options to `fetchWithCache()` or `useCachedFetch()`
2. **Route pattern** — configured in `features.serviceWorker.strategies`
3. **Global default** — configured at `features.serviceWorker.*`

This applies to: `strategy`, `staleTime`, `refetchOnWindowFocus`, `refetchOnReconnect`, `refetchInterval`.

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

## Boolean features

| Feature | Config path | Default |
|---------|-------------|---------|
| Background Sync | `features.backgroundSync` | `false` |
| Cross-tab Sync | `features.crossTabSync` | `true` |
| Tag Invalidation | `features.tagInvalidation` | `true` |

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
