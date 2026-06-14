# Configuration Reference

Full schema for `swoff.config.json` — every field, its type, default, and description.

## Quick reference

```json
{
  "$schema": "https://swoff.netlify.app/schema/v1.json",
  "framework": "react-spa",
  "build": {
    "outputDir": "dist",
    "swFilename": "sw"
  },
  "features": {
    "requestBatchWindowMs": 50,
    "pwa": {
      "enabled": true,
      "preventDefaultInstall": false
    },
    "serviceWorker": {
      "version": "package",
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
        "clearRuntimeOnUpdate": false,
        "normalizeKey": false,
        "ignoreQueryParams": []
      },
      "navigation": {
        "mode": "spa",
        "preload": true,
        "fallback": "/index.html",
        "rules": []
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
      "retryBackoffMs": 1000,
      "backgroundSync": false
    },
    "auth": {
      "enabled": false,
      "type": "bearer",
      "routePaths": ["/login", "/logout", "/register", "/api/login", "/api/logout", "/api/register", "/api/refresh", "/api/me"]
    },
    "graphql": {
      "enabled": false,
      "endpoints": ["/graphql"]
    },
    "tagInvalidation": {
      "crossTabSync": true
    },
    "realtime": {
      "pushNotifications": false,
      "serverPush": {
        "enabled": false,
        "type": "sse",
        "endpoint": "/api/events",
        "reconnectDelayMs": 5000
      }
    }
  }
}
```

---

## Top-level fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `$schema` | `string` | — | JSON Schema URL (for IDE autocomplete) |
| `framework` | `"react-spa"` \| `"nextjs"` \| `"remix"` \| `"tanstack-start-react"` \| `"astro"` \| `"nuxt"` \| `"sveltekit"` \| `"vue"` \| `"svelte"` \| `"vanilla"` | auto-detected | Your UI framework. Meta-frameworks auto-configure navigation mode, strategy defaults, and build paths via `swoff init`. |
| `build.outputDir` | `string` | `"dist"` | Build tool output directory |
| `build.swFilename` | `string` | `"sw"` | Service worker filename prefix (e.g. `sw-v1.2.3.js`) |
| `build.precacheDirs` | `object` | `{}` | Additional directories to precache. Keys are filesystem paths (relative to project root). Values are objects with `prefix` and optional filter/transform options. E.g. `{ "public/assets": { "prefix": "/assets" } }` precaches all files from `public/assets/` served at `/assets/*`. When empty, only `outputDir` is scanned. See [PrecacheDirConfig](#precachedirconfig) below. |

---

### PrecacheDirConfig

Each `precacheDirs` value is an object with the following fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `prefix` | `string` | (required) | URL prefix to serve assets under |
| `extensions` | `string[]` | — | Only include files with these extensions (e.g. `[".html", ".json"]`). Omit to include all files. |
| `stripExtension` | `boolean` | `false` | Remove the file extension from the cached URL key. E.g. `about.html` → `/about` |
| `stripSuffixes` | `string[]` | — | Strip these path segments before the extension (e.g. `["index", "page"]`). After extension stripping, each matching suffix is removed: `index.html` → `/`, `about/index.html` → `/about`, `blog/page.html` → `/blog`. Trailing slashes are then cleaned for consistent cache key matching (unless the result is `/`). |

Example — precache NextJS static HTML pages without the `.html` extension and normalize `index` to root:

```json
{
  ".next/static": { "prefix": "/_next/static" },
  ".next/server/app": {
    "prefix": "",
    "extensions": [".html"],
    "stripExtension": true,
    "stripSuffixes": ["index"]
  }
}
```

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
| `version` | `"package"` \| `"hash"` \| `"manual"` \| `string` | `"package"` | SW version mode. Generates `swoff/sw-version.ts` as the single version source. `"package"`: auto-reads from `package.json` at build time. `"hash"`: every build produces a unique cache name (uses `Date.now().toString(36)`), SW URL stays fixed. `"manual"`: user edits `swoff/sw-version.ts` directly — the build script reads it. Any string works — no semver or keyword validation. |
| `autoActivate` | `boolean` | `false` | Automatically activate newly registered service workers (`skipWaiting()`). When `false`, the SW activates on next navigation or browser reload — no user prompt. |

### `features.serviceWorker.strategy`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `default` | `string` | `"cache-first"` | Default caching strategy (lowest priority in 3-tier resolution). One of: `cache-first`, `network-first`, `stale-while-revalidate`, `cache-only`, `network-only`, `reactive` |
| `patterns` | `object` | `{}` | Per-route strategy overrides. Keys are URL patterns (e.g. `/api/*`). Values can be a strategy name string or a `StrategyEntry` object |
| `reactive.defaults.staleTime` | `number` | `0` | Global stale time in seconds for reactive strategy. Data is considered fresh for this long; after expiry, SW serves cached but triggers a background refresh. 0 = always stale. |
| `reactive.defaults.refetchInterval` | `number` | `0` | Global auto-refetch interval in seconds for reactive strategy. SW periodically re-fetches matching routes in the background. 0 disables. |
| `reactive.defaults.refetchOnReconnect` | `boolean` | `false` | Global default — refetch reactive entries when the browser comes back online |
| `reactive.defaults.refetchOnFocus` | `boolean` | `false` | Global default — refetch reactive entries when the tab gains focus |
| `clearRuntimeOnUpdate` | `boolean` | `false` | Clear runtime cache when a new SW version activates |
| `normalizeKey` | `boolean` | `false` | When `true`, query params are sorted alphabetically in cache keys so `?b=1&a=2` and `?a=2&b=1` resolve to the same entry. |
| `ignoreQueryParams` | `string[]` | `[]` | Query params to strip from cache keys (e.g. `["_t", "utm_source"]`). Prevents cache-busting params from creating duplicate cache entries. |
| `timeout` | `number` | `10` | Network fetch timeout in seconds. The SW's `_fetch` wraps `fetch()` with an `AbortController` that aborts after this duration. On timeout or network error, a `SW_NOTIFICATION` is broadcast (level: `"error"`, code: `"FETCH_FAILED"`), and the strategy falls through to its cache fallback. |

### `features.serviceWorker.navigation`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | `"spa"` \| `"default"` \| `"ssr"` | `"spa"` | Navigation mode. `"spa"`: runtime serves global fallback directly from precache (no runtime HTML caching). `"default"`: no special navigation handling — strategies handle all requests equally. `"ssr"`: runtime checks HTML cache → per-route fallback → global fallback; adds auto-prefetch that intercepts `history.pushState`/`replaceState` to warm the SW cache on client-side navigation. |
| `preload` | `boolean` | `true` | Enable Navigation Preload API — reduces SW startup latency |
| `fallback` | `string` | `""` | Global fallback HTML path for offline navigation. For SPA mode, set to `"/index.html"` to serve the SPA shell from precache when offline. For SSR mode, checked after per-route fallback if the runtime HTML cache misses. |
| `precacheRoutes` | `string[]` | `[]` | Additional routes to fetch + cache during SW install (e.g. `["/", "/about"]`). Useful for SSG or critical pages. |
| `rules` | `NavigationRule[]` | `[]` | Per-route offline fallback pages (see below). Rules provide the fallback path used when strategy dispatch fails; they do not override the caching strategy. |
#### `NavigationRule`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `match` | `string` | (required) | Glob pattern matching request paths (supports `*`, `**`, `?`, `{a,b}`). |
| `fallback` | `string` | — | Per-route offline fallback HTML path. Used in the ultimate fallback chain, checked before the global fallback. |

#### Example — per-route fallback rules

```json
"navigation": {
  "mode": "ssr",
  "fallback": "/offline.html",
  "rules": [
    { "match": "/blog/*", "fallback": "/blog-offline.html" },
    { "match": "/dashboard/**", "fallback": "/dashboard-offline.html" }
  ]
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

## `features.requestBatchWindowMs`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `requestBatchWindowMs` | `number` | `50` | Time window in ms to coalesce concurrent GET requests to the same URL before dispatching to the SW. 0 disables batching. |

---

## `features.refetchQueue`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `batchSize` | `number` | `5` | Max stale cache entries to refetch per batch |
| `batchDelayMs` | `number` | `1000` | Delay in ms between batch cycles (rate limiting) |
| `retry.maxRetries` | `number` | `3` | Max retries for background refetches (exponential backoff) |
| `retry.backoffMs` | `number` | `1000` | Base delay in ms for retry backoff (delay × 2^retryCount) |
| `retry.maxBackoffMs` | `number` | `10000` | Maximum delay cap for backoff (10s) |
| `retry.jitterMs` | `number` | `100` | Random jitter in ms added to each backoff delay to prevent thundering herd |

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
| `type` | `"bearer"` \| `"cookie"` \| `"custom"` \| `"better-auth"` \| `"next-auth"` \| `"clerk"` \| `"supabase"` | `"bearer"` | Auth adapter type. Determines how Swoff communicates with your auth provider. See [auth/adapter.ts](#auth-adapterts) in API.md. |
| `routePaths` | `string[]` | `["/login", "/logout", "/register", "/api/login", "/api/logout", "/api/register", "/api/refresh", "/api/me"]` | URL path prefixes that bypass SW caching at build time. Requests matching any of these paths return immediately in the SW fetch handler, before strategy resolution. Auth endpoints must always reach the server. |

> **Note:** Token refresh path and user endpoint are now configured inside the generated `auth/adapter.ts` file, not in `swoff.config.json`. The adapter provides `refresh()` and `fetchUser()` methods with well-known defaults (`/api/refresh`, `/api/me`) that you can edit per provider.

---

## `features.graphql`

Object-only feature (boolean shorthand not supported).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Generate GraphQL wrapper (`queryGql` / `mutateGql`) |
| `endpoints` | `string[]` | `["/graphql"]` | GraphQL API endpoints. Supports multiple — pass `endpointIndex` to `fetchWithCache()`, `useCachedFetch()`, `queryGql()`, or `mutateGql()` to select one. |

---

## `features.realtime`

Container for real-time features — push notifications and server-sent events.

### `features.realtime.pushNotifications`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `pushNotifications` | `boolean` | `false` | Enable push notification subscription management. Generates `swoff/realtime/notifications.ts` with `subscribeToPush()` / `unsubscribeFromPush()`. |
| `vapidPublicKey` | `string` | — | VAPID public key for push subscription. Required when `pushNotifications` is `true`. Baked into the generated push handler at build time — not needed at runtime. |

### `features.realtime.serverPush`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable real-time cache invalidation via SSE or WebSocket |
| `type` | `"sse"` \| `"websocket"` | `"sse"` | Transport protocol |
| `endpoint` | `string` | `"/api/events"` | Push endpoint URL |
| `reconnectDelayMs` | `number` | `5000` | Initial reconnect delay on connection loss (exponential backoff, capped at 30s) |

---

## `features.tagInvalidation`

Object-only feature (boolean shorthand not supported). Tag invalidation is always active — the `enabled` field was removed in v1.0.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `crossTabSync` | `boolean` | `true` | Cross-tab cache invalidation sync. When `true`, invalidation events broadcast to all open tabs. |
| `debounceMs` | `number` | `0` | Debounce window (ms) for coalescing rapid invalidations. When > 0, repeated `INVALIDATE_TAG` messages within the window are batched and processed once, reducing redundant cache scans. |
| `skipPrefixes` | `string[]` | `["api","v1","v2","v3","rest","graphql","gql"]` | URL path prefixes to skip during tag generation |
| `patterns` | `object` | `{}` | Custom glob patterns for tag generation. Keys are URL patterns (`/api/:id`), values are tag template arrays (`["{id}"]`) |
| `singularization` | `object` | `{}` | Custom plural→singular mapping (e.g. `{"categories": "category"}`). Default: strips trailing `s`. |
| `cascading` | `Record<string, string[]>` | `{}` | Cascading tag dependencies. `{"todos": ["categories"]}` — invalidating `todos` also invalidates `categories` |

---

## Boolean sub-features

These boolean flags nest under their parent object feature:

| Feature | Config path | Default |
|---------|-------------|---------|
| Background Sync | `features.mutationQueue.backgroundSync` | `false` |
| Cross-tab Sync | `features.tagInvalidation.crossTabSync` | `true` |
| Push Notifications | `features.realtime.pushNotifications` | `false` |

---

## Feature dependencies

Some features work best together:

| Feature | Recommended combo | Why |
|---------|------------------|-----|
| `mutationQueue.backgroundSync` | + `mutationQueue` | Background Sync processes mutations even after tab close |
| `tagInvalidation.crossTabSync` | + `tagInvalidation` | Invalidation events broadcast to all open tabs |
| `realtime.serverPush` | + `tagInvalidation` | Server push triggers `invalidateByTag()` — requires tag invalidation to function |
| `auth` + `mutationQueue` | — | `flushMutations()` after re-login replays mutations that failed with 401 |
| `graphql` | + `mutationQueue` + `tagInvalidation` | Offline GQL mutations queue in IndexedDB; mutations auto-invalidate operation-name tags |
