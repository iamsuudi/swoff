# @swoff/cli

CLI for [Swoff](https://swoff.netlify.app) — offline-first web apps made easy.

Swoff generates a **service worker** and **client-side utilities** that give your web app:

- **Offline support** — cached API responses work without a connection
- **Mutation queue** — writes performed offline replay when back online
- **Auth** — token management with automatic 401 handling
- **Cache invalidation** — tag-based cache busting after mutations
- **PWA** — install prompt and manifest
- **Cross-tab sync** — broadcast changes across open tabs
- **Background Sync API** — process mutations even after tab close

It lives in your project as a `swoff/` directory — everything is generated, auditable, and editable.

Source: [github.com/iamsuudi/swoff](https://github.com/iamsuudi/swoff)

---

## Quick Start

```bash
# Initialize configuration (creates swoff.config.json)
npx @swoff/cli init

# Generate service worker and supporting files
npx @swoff/cli generate

# Import the generated entry point in your app
```

```js
import { initServiceWorker } from "./swoff/client-injector.js";

initServiceWorker();
```

Then build your app:

```bash
npm run build
```

The build script auto-appends `node swoff/sw/generator.js` to finalize the service worker with your asset hashes.

---

## Commands

| Command | Description |
|---------|-------------|
| `init` | Create `swoff.config.json` with auto-detected framework and language |
| `generate` | Generate service worker and all supporting files |
| `add <feature>` | Enable a feature and regenerate |
| `validate` | Validate `swoff.config.json` |
| `info [feature]` | Show summary or per-feature details |
| `clean` | Remove all Swoff files (`swoff/`, config, `version.json`) |
| `help [command]` | Show help for a specific command |

### `init`

Creates `swoff.config.json` in your project root. Auto-detects:

- **Framework**: react, vue, svelte, or vanilla
- **Language**: TypeScript or JavaScript
- **Build tool**: Uses existing `package.json` build script

```bash
swoff init
swoff init --framework react   # override detection
```

### `generate`

Generates the service worker (`dist/sw-<version>.js`) and all supporting files into `swoff/`. Also auto-appends the SW generator to your `package.json` build script.

```bash
swoff generate
swoff generate --sw-only      # regenerate only the service worker
swoff generate --files-only   # regenerate only supporting files
```

After generation, read `swoff/GUIDE.md` for the full integration guide for your project.

### `add <feature>`

Enables a feature in `swoff.config.json` and regenerates.

```bash
swoff add pwa
swoff add mutation-queue
swoff add auth
swoff add tag-invalidation
swoff add cross-tab
swoff add background-sync
```

### `info`

Shows enabled features and file count, or detailed docs for a specific feature.

```bash
swoff info                 # summary
swoff info auth            # auth details and functions
swoff info mutation-queue  # mutation queue details
```

### `clean`

Removes every generated file:

```bash
swoff clean
```

This deletes `swoff/`, `swoff.config.json`, `version.json`, and removes the SW generator from your build script.

---

## Configuration (`swoff.config.json`)

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
        "/api/*": "network-first",
        "/static/*": "cache-first"
      },
      "clearRuntimeOnUpdate": false,
      "navigationMode": "spa",
      "spaEntry": "/index.html"
    },
    "mutationQueue": false,
    "backgroundSync": false,
    "auth": {
      "enabled": false,
      "type": "bearer",
      "refreshPath": "/api/refresh",
      "userEndpoint": "/api/me"
    },
    "crossTabSync": true,
    "tagInvalidation": true
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `$schema` | `string` | — | JSON Schema URL |
| `enabled` | `boolean` | `true` | Enable Swoff |
| `framework` | `"react"` \| `"vue"` \| `"svelte"` \| `"vanilla"` | auto | Your UI framework |
| `build.outputDir` | `string` | `"dist"` | Build output directory |
| `build.swFilename` | `string` | `"sw"` | Service worker filename prefix |
| `features.pwa.enabled` | `boolean` | `true` | PWA install + manifest |
| `features.pwa.preventDefaultInstall` | `boolean` | `false` | Prevent default install prompt |
| `features.serviceWorker.version.enabled` | `boolean` | `true` | Enable versioned SW |
| `features.serviceWorker.version.source` | `"from-package"` \| `"manual"` | `"from-package"` | Version source |
| `features.serviceWorker.version.value` | `string` | — | Manual version (required if source is `"manual"`) |
| `features.serviceWorker.version.minSupportedVersion` | `string` | `"0.0.0"` | Min supported SW version |
| `features.serviceWorker.autoUpdate` | `boolean` | `true` | Auto-update SW |
| `features.serviceWorker.autoActivate` | `boolean` | `false` | Auto-activate SW |
| `features.serviceWorker.defaultStrategy` | `string` | `"cache-first"` | Default cache strategy |
| `features.serviceWorker.strategies` | `object` | `{}` | Per-route caching strategies |
| `features.serviceWorker.clearRuntimeOnUpdate` | `boolean` | `false` | Clear runtime cache on update |
| `features.serviceWorker.navigationMode` | `"spa"` \| `"default"` | `"spa"` | Navigation caching mode |
| `features.serviceWorker.spaEntry` | `string` | `"/index.html"` | SPA entry for nav fallback |
| `features.mutationQueue` | `boolean` | `false` | Offline write queue |
| `features.backgroundSync` | `boolean` | `false` | Background Sync API |
| `features.auth.enabled` | `boolean` | `false` | Auth module |
| `features.auth.type` | `"bearer"` \| `"cookie"` \| `"custom"` | `"bearer"` | Auth strategy |
| `features.auth.refreshPath` | `string` | `"/api/refresh"` | Token refresh endpoint |
| `features.auth.userEndpoint` | `string` | `"/api/me"` | Current user endpoint |
| `features.crossTabSync` | `boolean` | `false` | Cross-tab broadcast |
| `features.tagInvalidation` | `boolean` | `false` | Tag-based cache invalidation |

---

## Generated Files

```
swoff/
├── client-injector.ts     # Orchestrator — wires all features together
│   Imports: sw/injector, pwa/install, mutation-queue
│   Exports: initServiceWorker()
│   Always generated
│
├── fetch-wrapper.ts       # Unified fetch with caching, auth, offline queue
│   Imports: invalidation-tags, cache, auth/store, mutation-queue (conditional)
│   Exports: fetchWithCache(input, options?)
│   Always generated
│
├── cache.ts               # Low-level cache invalidation
│   Exports: invalidateByTag(), invalidateByTags()
│   Generated when: tagInvalidation is true
│
├── invalidation-tags.ts   # Tag generation helpers
│   Exports: generateTags(), invalidateUrl(), invalidateByMethod()
│   Generated when: tagInvalidation is true
│
├── mutation-queue.ts      # Offline write queue
│   Exports: queueMutation(), processMutationQueue(), flushMutations(), getPendingCount()
│   Generated when: mutationQueue is true
│
├── background-sync.ts     # Background Sync API
│   Exports: syncWhenPossible(), retrySync()
│   Generated when: backgroundSync is true
│
├── swoff.d.ts             # TypeScript declarations for all generated modules
│
├── auth/                  # Generated when auth.enabled is true
│   ├── store.ts           # Token/user persistence (memory + IndexedDB)
│   │   Exports: setAuth(), getAuth(), clearAuth(), isAuthValid(), createAuthFromResponse()
│   ├── fetch.ts           # Auth-aware fetch wrapper — wraps fetchWithCache
│   │   Exports: authenticatedFetch(), ensureValidAuth()
│   ├── user.ts            # User data caching
│   │   Exports: fetchCurrentUser(), getCachedUser(), cacheUser(), clearCachedUser()
│   └── state.ts           # Online/offline × auth state detection
│       Exports: getAuthState()
│
├── hooks/                 # Generated when framework is "react"
│   ├── useAuth.tsx        # Reactive auth + connectivity state
│   ├── useCachedFetch.tsx # Auto-refetch on cache invalidation
│   ├── useMutationQueue.tsx # Queue status and sync results
│   └── usePWAUpdate.tsx   # SW update management + download progress
│
├── pwa/
│   └── install.ts         # PWA install prompt handling
│       Exports: setupPwaInstall(), isInstallable(), promptInstall()
│       Generated when: pwa.enabled is true
│
├── sw/
│   ├── template.js        # Service worker source (runs in SW scope)
│   │                      # Implements all 5 caching strategies in the SW
│   ├── injector.ts        # SW registration logic
│   │                      # Exports: initServiceWorker(), handleUpdateApproved(), skipWaiting()
│   └── generator.js       # Build-time script — embeds asset hashes into SW
│
├── manifest.json
├── GUIDE.md               # Full integration walkthrough
└── README.md              # Quick reference
```

---

## Cache Strategies

The service worker applies a caching strategy to every read request (GET, HEAD, or requests with `type: "read"`). Strategy resolution:

1. Check `features.serviceWorker.strategies` in `swoff.config.json` for matching URL pattern
2. Fall back to `features.serviceWorker.defaultStrategy` (default: `"cache-first"`)

| Strategy | Behavior | Best for |
|----------|----------|----------|
| `cache-first` | Return cached if available, else fetch + cache. Default. | Static assets, images, fonts, rarely-changing data |
| `network-first` | Try network. On success, cache. On failure, serve cache. | API endpoints, dynamic content where freshness matters |
| `stale-while-revalidate` | Return cached immediately, refresh cache in background. | Fast UI, non-critical data, content that can be slightly stale |
| `cache-only` | Serve from cache only. Returns 404 if missing. | Offline-critical assets that must always be available |
| `network-only` | Always fetch, never cache. | Sensitive or real-time data, payment flows |

Per-request override: set `staleWhileRevalidate: true` on any `fetchWithCache(options)` to use stale-while-revalidate for that request regardless of the configured strategy.

---

## fetchWithCache API

A drop-in replacement for `fetch()` that communicates with the service worker about caching, handles offline mode, deduplicates in-flight requests, auto-generates cache tags, and auto-invalidates after mutations.

```js
import { fetchWithCache } from "./swoff/fetch-wrapper.js";

// Read — cached by the SW for offline access
const { response, fromCache } = await fetchWithCache("/api/todos");
const data = await response.json();

// Mutation — passes through, auto-invalidates cache tags
await fetchWithCache("/api/todos", {
  method: "POST",
  body: JSON.stringify({ title: "New task" }),
});

// POST used as a read (search, GraphQL) — override with type: "read"
await fetchWithCache("/api/search", {
  method: "POST",
  type: "read",
  body: JSON.stringify({ query: "hello" }),
});

// With cache tags + stale-while-revalidate
const { response: staleRes, fromCache } = await fetchWithCache("/api/data", {
  tags: ["data"],
  staleWhileRevalidate: true,
});

// Auth + disable offline queue
const { response: userRes } = await fetchWithCache("/api/me", {
  auth: true,
  queueOffline: false,
});
```

### Options

All `RequestInit` fields are supported (`method`, `body`, `headers`, `credentials`, `signal`, etc.), plus:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tags` | `string[]` | auto-generated | Cache invalidation tags for this request |
| `staleWhileRevalidate` | `boolean` | `false` | Return cached immediately, refresh in background |
| `auth` | `boolean` | `false` | Attach auth token (uses `getAuth()`) |
| `queueOffline` | `boolean` | `true` | When offline, queue writes to IndexedDB for later replay |
| `invalidate` | `'auto' \| string[] \| false` | `'auto'` | Auto-invalidate cache tags after a successful mutation |
| `type` | `'read' \| 'mutation'` | auto-detected | Override read/mutation detection |

### Behavior

- **Read vs mutation**: GET/HEAD → read (cached). POST/PUT/DELETE/PATCH → mutation (pass through). Override with `type: 'read'` or `type: 'mutation'`.
- **Offline reads**: returns cached response if available, throws if not cached.
- **Offline writes**: queues to IndexedDB (when `mutationQueue` enabled). Replays on `online` event. Disable per-request with `queueOffline: false`.
- **Dedup**: in-flight GETs to the same URL return a single promise (cloned response).
- **Auto-tags**: when `tagInvalidation` is enabled, tags are derived from the URL for read requests.
- **Auto-invalidate**: after a successful mutation, matching cache tags are invalidated so the SW re-fetches fresh data.
- **Auth**: when `auth: true`, attaches Bearer token via `getAuth()`. Dispatches `sw-auth-unauthorized` on 401 and clears auth.

### Return value

```
{ response: Response, fromCache: boolean }
```

- `response`: the fetch Response (from cache or network)
- `fromCache`: `true` when the response was served from cache

---

## Auth API

The auth module is generated when `features.auth.enabled` is `true`. It manages authentication state with a **memory-only token** (never persisted to disk) and optional IndexedDB caching for offline user display.

### authenticatedFetch(input, options?)

An auth-aware wrapper around `fetchWithCache`. Use for all authenticated requests.

```js
import { authenticatedFetch } from "./swoff/auth/fetch.js";

// Attaches auth headers, bypasses SW cache for auth URLs, handles 401
const user = await authenticatedFetch("/api/me").then((r) => r.json());

// Mutations too — no separate wrapper needed
await authenticatedFetch("/api/todos", {
  method: "POST",
  body: JSON.stringify({ title: "New" }),
});
```

**What it adds over fetchWithCache:**

| Step | What happens |
|------|-------------|
| 1 | Calls `getAuth()` to retrieve the stored token/user |
| 2 | Calls `withAuthHeaders(headers, auth)` — injects Bearer token, cookie, or custom header based on `auth.type` in config |
| 3 | Marks auth endpoints (`/login`, `/logout`, `/register`, `refreshPath`, `userEndpoint`) as `"mutation"` strategy so the SW never caches them |
| 4 | For `auth.type: "cookie"`, sets `credentials: "include"` |
| 5 | Delegates to `fetchWithCache(input, options)` |
| 6 | On 401 response: calls `clearAuth()`, dispatches `sw-auth-unauthorized` event |

**Parameters:** `input: RequestInfo` + all `fetchWithCache` options + `type?: 'read' | 'mutation'`

**Returns:** `Promise<Response>` (unwrapped — no `fromCache` property)

### Auth functions

| Function | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `setAuth(authData)` | `{ token?, user?, expiresAt? }` | `Promise<void>` | Store auth in memory, persist user to IndexedDB |
| `getAuth()` | — | `Promise<AuthData \| null>` | Retrieve auth from memory (or IndexedDB fallback after page refresh) |
| `clearAuth()` | — | `Promise<void>` | Clear memory + IndexedDB. Call on logout/401 |
| `isAuthValid(auth)` | `AuthData \| null` | `boolean` | Check existence + expiry (`expiresAt`). Returns `true` if no `expiresAt` set |
| `createAuthFromResponse(response)` | server login response | `AuthData` | **Edit this** to match your backend's login response shape |
| `ensureValidAuth()` | — | `Promise<AuthData \| null>` | Check expiry, refresh token via `refreshPath` if needed |
| `fetchCurrentUser()` | — | `Promise<Record<string, unknown> \| null>` | Fetch from `userEndpoint` and cache in IndexedDB |
| `getCachedUser()` | — | `Promise<Record<string, unknown> \| null>` | Load user from IndexedDB (available offline) |
| `cacheUser(user)` | user object | `Promise<void>` | Manually persist user data |
| `clearCachedUser()` | — | `Promise<void>` | Remove user from cache |
| `getAuthState()` | — | `Promise<{ authenticated, user, online }>` | Detect which of 4 states the app is in |

### Auth types

| `auth.type` | How auth headers are set | Notes |
|-------------|------------------------|-------|
| `"bearer"` | `Authorization: Bearer <token>` | Token in memory only. Re-login required after page refresh. Use `refreshPath` for token refresh. |
| `"cookie"` | No explicit header. `credentials: "include"` is set for all requests. | HttpOnly cookie handled by the server. |
| `"custom"` | **Edit the `withAuthHeaders` function** in `auth/fetch.ts` | Full control over header injection. |

---

## Mutation Queue

When the user is offline, write operations (POST/PUT/DELETE) are stored in IndexedDB. They replay automatically when the connection returns.

```js
import { queueMutation, getPendingCount } from "./swoff/mutation-queue.js";

// Offline write — stored and replayed when online
await queueMutation({
  method: "POST",
  url: "/api/todos",
  body: { title: "Buy milk" },
  tags: ["todos"],
});

// Show sync badge
const count = await getPendingCount();
```

| Function | Description |
|----------|-------------|
| `queueMutation(mutation)` | Store a write for later sync |
| `processMutationQueue()` | Replay all queued writes. Runs automatically on `online` event |
| `flushMutations()` | Same as `processMutationQueue`. Call after re-login (queued mutations may have stale auth) |
| `getPendingCount()` | Number of mutations waiting to sync |

Generated when `features.mutationQueue` is `true`.

---

## Cache Invalidation

Tag-based invalidation keeps the service worker cache fresh after mutations.

```js
import { generateTags, invalidateUrl } from "./swoff/invalidation-tags.js";

// Tag reads automatically
const data = await fetchWithCache("/api/todos", {
  tags: generateTags("/api/todos"),
});

// Invalidate after writing
await invalidateUrl("/api/todos/42");
```

When the SW receives an invalidation, it removes matching cache entries and attempts to background-refetch them. If the refetch fails (network error), the old cached entry is served with a stale-while-revalidate fallback.

| Function | Description |
|----------|-------------|
| `generateTags(url)` | Extract tags from URL path. e.g. `/api/todos/42` → `["todos", "todo:42"]` |
| `invalidateUrl(url)` | Extract tags from URL and invalidate all matching cache entries |
| `invalidateByTag(tag)` | Invalidate a single tag. Dispatches `cache-invalidated` event |
| `invalidateByTags(tags)` | Invalidate multiple tags |

Generated when `features.tagInvalidation` is `true`.

---

## PWA

Install prompt handling and manifest generation.

```js
import { isInstallable, promptInstall } from "./swoff/pwa/install.js";

// Show install button conditionally
if (isInstallable()) {
  const { outcome } = await promptInstall();
}
```

| Function | Description |
|----------|-------------|
| `setupPwaInstall()` | Listen for `beforeinstallprompt`/`appinstalled` events. Called automatically by `client-injector.ts` |
| `isInstallable()` | Check if install prompt is available |
| `promptInstall()` | Show the native install prompt. Returns `{ outcome }` |

Generated when `features.pwa.enabled` is `true`.

---

## React Hooks

When `features.framework` is `"react"`, generated hooks provide reactive state:

| Hook | Returns | Description |
|------|---------|-------------|
| `useAuth()` | `{ authenticated, user, online }` | Auth + connectivity state. Listens to online/offline/auth changes |
| `useCachedFetch(url, options?)` | `{ data, error, loading, refetch }` | Fetches data, auto-refetches on tag invalidation events |
| `useMutationQueue()` | `{ pending, lastSync }` | Queue status (`pending` count) and last sync result (`lastSync.succeeded`, `lastSync.failed`) |
| `usePWAUpdate()` | `{ updateStatus, progress, forceUpdate, acceptUpdate, dismissUpdate }` | SW update management. `updateStatus` is one of `"idle"`, `"available"`, `"downloading"`, `"ready"` |
| `useSWProgress()` | `{ status, progress }` | Download progress during SW update. `progress` is `{ percent, downloaded, total }` |

```tsx
import { useCachedFetch } from "./swoff/hooks/useCachedFetch.tsx";

function Todos() {
  const { data, loading } = useCachedFetch("/api/todos");
  if (loading) return <Spinner />;
  return <TodoList data={data} />;
}
```

---

## Build Script

After `swoff generate`, your `package.json` build script is updated to:

```json
"build": "vite build && node swoff/sw/generator.js"
```

The generator (`sw/generator.js`) runs after every build:

1. Reads `swoff.config.json` for output dir, version, and strategy config
2. Reads `sw/template.js` — the service worker source
3. Collects all built assets from the output directory
4. Replaces placeholders (`[[CACHE_NAME]]`, `[[ASSETS_LIST]]`, `[[AUTO_SKIP_WAITING]]`) with actual values
5. Writes the final versioned SW file (e.g. `dist/sw-v1.2.3.js`) and `version.json`

Running `swoff clean` removes the generator suffix from your build script.

---

## Requirements

- Node.js >= 18
- A build tool with a `package.json` build script (Vite, Webpack, etc.)
- HTTPS or localhost (required for service workers)

## License

MIT
