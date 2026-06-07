# Configuration Reference

Full schema for `swoff.config.json` — every field, its type, default, and description.

## Quick reference

```json
{
  "$schema": "https://swoff.netlify.app/schema/v1.json",
  "configVersion": 1,
  "enabled": true,
  "framework": "react",
  "apiBaseUrl": "",
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
      "version": "package",
      "minSupportedVersion": "1.0.0",
      "autoUpdate": true,
      "autoActivate": false,
      "strategy": {
        "default": "cache-first",
        "patterns": {
          "/api/*": { "strategy": "reactive", "staleTime": 30, "refetchOnFocus": true },
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
        "mode": "all",
        "clearRuntimeOnUpdate": false,
        "normalizeKey": false,
        "ignoreQueryParams": []
      },
      "navigation": {
        "mode": "spa",
        "preload": true,
        "fallback": "/index.html"
      }
    },
    "refetchQueue": {
      "batchSize": 5,
      "batchDelayMs": 1000,
      "maxRetries": 3,
      "retryDelayMs": 1000
    },
    "mutationQueue": {
      "enabled": false,
      "batchSize": 1,
      "batchDelayMs": 0,
      "maxRetries": 5,
      "retryBackoffMs": 1000
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
    "tagInvalidation": {
      "enabled": true
    },
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
| `configVersion` | `number` | `1` | Config schema version. The CLI warns when loading a config with a missing or outdated version. Incremented when breaking changes are introduced. |
| `enabled` | `boolean` | `true` | Master switch — disables all Swoff features |
| `framework` | `"react"` \| `"vue"` \| `"svelte"` \| `"vanilla"` \| `"nextjs"` \| `"remix"` \| `"astro"` \| `"nuxt"` \| `"sveltekit"` | auto-detected | Your UI framework. Meta-frameworks auto-configure navigation mode, strategy defaults, and build paths via `swoff init`. |
| `apiBaseUrl` | `string` | `""` | Base URL prepended to all relative API URLs. Set to your API server origin (e.g. `https://api.example.com`) when frontend and API are on different domains. Leave empty string when same origin. |
| `build.outputDir` | `string` | `"dist"` | Build tool output directory |
| `build.swFilename` | `string` | `"sw"` | Service worker filename prefix (e.g. `sw-v1.2.3.js`) |
| `build.precacheDirs` | `object` | `{}` | Additional directories to precache. Keys are filesystem paths (relative to project root), values are the URL prefix to serve them under. E.g. `{ "public/assets": "/assets" }` precaches all files from `public/assets/` served at `/assets/*`. When empty, only `outputDir` is scanned. |

---

## `features.pwa`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable PWA installability (generates `pwa/index.ts` + `pwa/prompt.ts` + `pwa/injector.ts` + `manifest.json`) |
| `preventDefaultInstall` | `boolean` | `false` | Suppress browser's native install prompt. When true, dev must call `promptInstall()` manually. |

---

## `features.serviceWorker`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `version` | `"package"` \| `"hash"` \| `string` | `"package"` | SW version mode. `"package"`: reads from `package.json`. `"hash"`: SHA-256 hash of generated SW content (deterministic, fixed SW URL). Semver string (e.g. `"1.2.3"`): explicit version. |
| `minSupportedVersion` | `string` | `"0.0.0"` | Minimum supported SW version — clients below this are force-updated on page load |
| `autoUpdate` | `boolean` | `true` | Automatically register new service worker versions when detected. When false, dispatches `sw-update-available` event for manual registration via `handleUpdateApproved()`. |
| `autoActivate` | `boolean` | `false` | Automatically activate newly registered service workers (`skipWaiting`). Only applies when a new version is registered — use with `autoUpdate` for fully silent updates, or wait for user consent then call `handleUpdateApproved()`. |
| `requestBatchWindowMs` | `number` | `50` | Time window in ms to coalesce concurrent GET requests to the same URL before dispatching to the SW. 0 disables batching. |

### `features.serviceWorker.strategy`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `default` | `string` | `"cache-first"` | Default caching strategy (lowest priority in 3-tier resolution). One of: `cache-first`, `network-first`, `stale-while-revalidate`, `cache-only`, `network-only`, `reactive` |
| `patterns` | `object` | `{}` | Per-route strategy overrides. Keys are URL patterns (e.g. `/api/*`). Values can be a strategy name string or a `StrategyEntry` object |
| `reactive.defaults.staleTime` | `number` | `0` | Global stale time in seconds for reactive strategy. Data is considered fresh for this long; after expiry, SW serves cached but triggers a background refresh. 0 = always stale. |
| `reactive.defaults.refetchInterval` | `number` | `0` | Global auto-refetch interval in seconds for reactive strategy. SW periodically re-fetches matching routes in the background. 0 disables. |
| `reactive.defaults.refetchOnReconnect` | `boolean` | `false` | Global default — refetch reactive entries when the browser comes back online |
| `reactive.defaults.refetchOnFocus` | `boolean` | `false` | Global default — refetch reactive entries when the tab gains focus |
| `mode` | `"all"` \| `"explicit-only"` | `"all"` | When to apply caching strategies. `"all"`: every GET/HEAD request; `"explicit-only"`: only requests with `X-SW-Cache-Strategy` header |
| `clearRuntimeOnUpdate` | `boolean` | `false` | Clear runtime cache when a new SW version activates |
| `normalizeKey` | `boolean` | `false` | When `true`, query params are sorted alphabetically in cache keys so `?b=1&a=2` and `?a=2&b=1` resolve to the same entry. |
| `ignoreQueryParams` | `string[]` | `[]` | Query params to strip from cache keys (e.g. `["_t", "utm_source"]`). Prevents cache-busting params from creating duplicate cache entries. |
| `timeout` | `number` | `10` | Network fetch timeout in seconds. The SW's `_fetch` wraps `fetch()` with an `AbortController` that aborts after this duration. On timeout or network error, a `SW_NOTIFICATION` is broadcast (level: `"error"`, code: `"FETCH_FAILED"`), and the strategy falls through to its cache fallback. |

### `features.serviceWorker.navigation`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | `"spa"` \| `"default"` \| `"ssr"` | `"spa"` | Navigation mode. `"spa"`: navigation requests use the global caching strategy; SPA shell served only as last resort offline fallback. `"default"`: no special navigation handling. `"ssr"`: same as `"default"` with auto-prefetch that intercepts `history.pushState`/`replaceState` to warm the SW cache on client-side navigation. |
| `preload` | `boolean` | `true` | Enable Navigation Preload API — reduces SW startup latency |
| `fallback` | `string` | `"/index.html"` | Fallback HTML for SPA navigation requests |
| `precacheRoutes` | `string[]` | `[]` | Additional routes to fetch + cache during SW install (e.g. `["/", "/about"]`). Useful for SSG or critical pages. |
| `offlineFallback` | `string` | `""` | Path to a custom offline HTML page. Served when the network is unavailable and no cached version exists. |
| `rules` | `NavigationRule[]` | `[]` | Per-route navigation policies and offline fallback pages (see below). |
| `retry` | `NavigationRetryConfig` | `{ "enabled": false, "intervalMs": 5000, "maxRetries": 12 }` | Smart retry when a navigation falls through to the ultimate offline fallback. The SW periodically retries the failed URL; on success, caches the response and broadcasts `swoff:navigation-online`. |

#### `NavigationRule`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `match` | `string` | (required) | Glob pattern matching request paths (supports `*`, `**`, `?`, `{a,b}`). |
| `policy` | `"cache-first"` \| `"network-first"` \| `"network-only"` \| `"stale-while-revalidate"` | `"network-first"` | Navigation policy for matching routes. `"cache-first"`: serve from precache immediately; `"network-first"`: try network, fall back to cache; `"network-only"`: always fetch (never cache); `"stale-while-revalidate"`: serve cached HTML instantly, refresh in background. |
| `offlineFallback` | `string` | — | Per-route offline fallback HTML path. Overrides the global `offlineFallback` for matching routes. |

#### `NavigationRetryConfig`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable smart retry. When `true`, the SW starts a background retry loop when serving the ultimate offline fallback. |
| `intervalMs` | `number` | `5000` | Milliseconds between retry attempts. |
| `maxRetries` | `number` | `12` | Maximum number of retry attempts before giving up. |

#### Example — per-route policies and fallbacks

```json
"navigation": {
  "mode": "network-first",
  "offlineFallback": "/offline.html",
  "rules": [
    { "match": "/", "policy": "cache-first" },
    { "match": "/about", "policy": "cache-first" },
    { "match": "/blog/*", "policy": "network-first", "offlineFallback": "/blog-offline.html" },
    { "match": "/dashboard/**", "policy": "network-only" },
    { "match": "/notes/**", "policy": "stale-while-revalidate" }
  ],
  "retry": {
    "enabled": true,
    "intervalMs": 3000,
    "maxRetries": 20
  }
}
```

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

---

## `features.refetchQueue`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `batchSize` | `number` | `5` | Max stale cache entries to refetch per batch |
| `batchDelayMs` | `number` | `1000` | Delay in ms between batch cycles (rate limiting) |
| `maxRetries` | `number` | `3` | Max retries for background refetches (exponential backoff) |
| `retryDelayMs` | `number` | `1000` | Base delay in ms for retry backoff (delay × 2^retryCount) |

---

### Resolution tiers

`strategy` and `staleTime` resolve in 3 tiers (highest to lowest priority):

1. **Per-request** — passed as options to `fetchWithCache({ strategy })` or `useCachedFetch()`, or via `X-SW-Strategy` / `X-SW-Stale-Time` headers
2. **Route pattern** — configured in `features.serviceWorker.strategy.patterns`
3. **Global default** — configured at `features.serviceWorker.strategy.reactive.defaults.*` (for `staleTime`) or `features.serviceWorker.strategy.default` (for `strategy`)

`refetchInterval`, `refetchOnReconnect`, and `refetchOnFocus` are SW-initiated (interval timers, online/focus event handlers) and resolve in 2 tiers only:

1. **Route pattern** — configured in the pattern entry
2. **Global default** — configured at `features.serviceWorker.strategy.reactive.defaults.*`

---

## `features.mutationQueue`

Object-only feature (boolean shorthand not supported).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable offline write queue |
| `batchSize` | `number` | `1` | Mutations per progress event |
| `batchDelayMs` | `number` | `0` | Delay between mutations (rate limiting) |
| `maxRetries` | `number` | `5` | Max retries before dropping a mutation |
| `retryBackoffMs` | `number` | `1000` | Exponential backoff base (nextRetry = backoff × 2^retryCount) |

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

Object-only feature (boolean shorthand not supported).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Generate GraphQL wrapper (`queryGql` / `mutateGql`) |
| `endpoint` | `string` | `"/graphql"` | GraphQL endpoint URL |

---

## `features.pushNotifications`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Generate push notification subscription management |
| `vapidPublicKey` | `string` | — | VAPID public key. Required for push notifications. Baked into the generated push handler at build time — not needed at runtime. |

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

Object-only feature (boolean shorthand not supported).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable tag-based cache invalidation |
| `debounceMs` | `number` | `0` | Debounce window (ms) for coalescing rapid invalidations. When > 0, repeated `INVALIDATE_TAG` messages within the window are batched and processed once, reducing redundant cache scans. |
| `prefixes` | `string[]` | `["api","v1","v2","v3","rest","graphql","gql"]` | URL path prefixes to skip during tag generation |
| `patterns` | `object` | `{}` | Custom glob patterns for tag generation. Keys are URL patterns (`/api/:id`), values are tag template arrays (`["{id}"]`) |
| `singularization` | `object` | `{}` | Custom plural→singular mapping (e.g. `{"categories": "category"}`). Default: strips trailing `s`. |
| `cascading` | `Record<string, string[]>` | `{}` | Cascading tag dependencies. `{"todos": ["categories"]}` — invalidating `todos` also invalidates `categories` |

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
