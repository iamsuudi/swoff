# Swoff Generated Files — Architecture Catalog

The `swoff swoff` command generates **28 file templates** into `swoff/`, producing up to **45 files** (including React adapter hooks). This document catalogs every generated file, its exports, dependencies, and whether it's user-facing or internal.

---

## 1. Generated Directory Structure

```
swoff/
├── client-injector.{js,ts}          ← Entry point for SW registration
├── config.{js,ts}                   ← API_BASE, per-environment config
├── connectivity.{js,ts}             ← Online/offline heartbeat + state
├── db.{js,ts}                       ← IndexedDB helper
├── reset.{js,ts}                    ← Nuclear cache/state wipe
├── storage.{js,ts}                  ← Storage estimate utilities
├── GUIDE.md                         ← Project-specific docs
├── swoff.d.ts                       ← TypeScript ambient declarations
│
├── sw/
│   ├── generator.js                 ← Build script (run after each build)
│   ├── template.js                  ← SW shell (gets config injected)
│   └── injector.{js,ts}             ← SW registration logic
│
├── fetch/
│   ├── core.{js,ts}                 ← fetchWithCache, prefetchCache
│   └── state.{js,ts}                ← In-flight fetch counter
│
├── cache/
│   ├── invalidate.{js,ts}           ← Tag/URL invalidation + introspection
│   └── tags.{js,ts}                 ← URL → tag generation
│
├── auth/                            ← Only if auth.enabled
│   ├── store.{js,ts}                ← Token/session management
│   ├── adapter.{js,ts}              ← User-editable provider glue
│   ├── state.{js,ts}                ← Auth state machine
│   └── check.{js,ts}                ← 401/unauthorized detection
│
├── mutation/                        ← Only if mutationQueue.enabled
│   ├── queue.{js,ts}                ← Offline write queue
│   ├── state.{js,ts}                ← Per-mutation UI state
│   └── sync.{js,ts}                 ← Background sync registration
│
├── pwa/                             ← Only if pwa.enabled
│   ├── prompt.{js,ts}               ← Install prompt management
│   └── injector.{js,ts}             ← Re-exports for client-injector
│
├── server-push/                     ← Only if serverPush.enabled
│   └── client.{js,ts}               ← SSE/WebSocket event client
│
├── push-notification/               ← Only if pushNotifications
│   └── index.{js,ts}                ← Push subscription management
│
├── graphql/                         ← Only if graphql.enabled
│   └── index.{js,ts}                ← GQL wrapper (fetchWithGql)
│
└── adapters/                        ← Only for React frameworks
    ├── useCachedFetch.tsx
    ├── useMutation.tsx
    ├── useCacheInvalidation.tsx
    ├── useNetworkStatus.tsx
    ├── useAuth.tsx
    ├── useMutationQueue.tsx
    ├── useMutationState.tsx
    ├── usePrefetch.tsx
    ├── useIsFetching.tsx
    ├── useStorageEstimate.tsx
    ├── usePwaInstall.tsx
    ├── useSWUpdate.tsx
    ├── useSwoffReset.tsx
    ├── useOfflineAnalytics.tsx
    ├── usePushSubscription.tsx
    └── useBackgroundSync.tsx
```

---

## 2. File Catalog

### Legend

| Column | Meaning |
|---|---|
| **Feature** | Config flag that controls generation |
| **User API** | Functions users call in their app code |
| **Internal** | Functions used internally by other swoff files |
| **Imports** | Dependencies on other generated files |

---

### 2.1 Always-Generated Files (Core)

#### `config.{js,ts}`

| | |
|---|---|
| **Generator** | `api-config.ts` → `api-config.ts` |
| **Feature** | Always |
| **User exports** | `API_BASE` (string constant, user-editable) |
| **Internal exports** | — |
| **Imports** | None |

---

#### `client-injector.{js,ts}`

| | |
|---|---|
| **Generator** | `client-injector.ts` → `client-injector.ts` |
| **Feature** | Always |
| **User exports** | `initServiceWorker()` |
| **Internal exports** | — |
| **Always imports** | `./sw/injector`, `./connectivity`, `./storage` |
| **Conditional imports** | `./pwa/prompt` (pwa enabled), `./mutation/queue` (mutationQueue enabled), `./auth/store` (auth enabled), `./server-push/client` (serverPush enabled), `./fetch/core` (navMode === "ssr") |

This is **the most important file** — the single entry point. It imports from 3-7 other modules depending on config. The `initServiceWorker()` function must be called explicitly; import-time side effects set up event listeners (online/offline, visibility change, heartbeat, SW message handler).

---

#### `sw/injector.{js,ts}`

| | |
|---|---|
| **Generator** | `sw-injector.ts` → `sw-injector.ts` |
| **Feature** | Always |
| **User exports** | `skipWaiting()` |
| **Internal exports** | `initServiceWorker()` |
| **Imports** | None |

Contains the raw `navigator.serviceWorker.register()` call. Imported and called by `client-injector`.

---

#### `connectivity.{js,ts}`

| | |
|---|---|
| **Generator** | `connectivity.ts` → `connectivity.ts` |
| **Feature** | Always |
| **User exports** | `getCurrentOnlineStatus()`, `forceRetry()` |
| **Internal exports** | `verifyAndNotify()`, `dispatchState()`, `startHeartbeat()`, `stopHeartbeat()` |
| **Imports** | None |

Heartbeat-based online/offline detection. Imported by `client-injector`.

---

#### `storage.{js,ts}`

| | |
|---|---|
| **Generator** | `storage.ts` → `storage.ts` |
| **Feature** | Always |
| **User exports** | `getStorageEstimate()`, `formatBytes()` |
| **Internal exports** | — |
| **Imports** | None |

Storage quota estimation. Imported by `client-injector` for the quota warning in `initServiceWorker()`.

---

#### `fetch/core.{js,ts}`

| | |
|---|---|
| **Generator** | `fetch-wrapper.ts` → `fetch-wrapper.ts` |
| **Feature** | Always |
| **User exports** | `fetchWithCache()`**,** `prefetchCache()` |
| **Internal exports** | — |
| **Imports** | `../config`, `../cache/tags`, `../cache/invalidate`, `../fetch/state`, `../auth/store` (if auth), `../mutation/queue` (if mutationQueue) |

The primary data-fetching API. Wraps `fetch()` with:
- Cache tags (auto-generated from URL or custom)
- Per-request strategy override (headers)
- Offline queue for mutations
- Auth header injection
- Request deduplication + batching
- Auto-invalidation on mutation success

---

#### `cache/invalidate.{js,ts}`

| | |
|---|---|
| **Generator** | `cache.ts` → `cache.ts` |
| **Feature** | Always |
| **User exports** | `invalidateByTag()`, `invalidateByTags()`, `invalidateUrl()`, `invalidateByMethod()`, `invalidateMatching()`, `getUrlsForTag()`, `getTagsForUrl()` |
| **Internal exports** | `expandCascading()` |
| **Imports** | `./tags` |

All cache invalidation + introspection functions. Communicates with the SW via `postMessage`.

---

#### `cache/tags.{js,ts}`

| | |
|---|---|
| **Generator** | `invalidation-tags.ts` → `invalidation-tags.ts` |
| **Feature** | Always |
| **User exports** | `generateTags()`, `generateTagsFromMethod()` |
| **Internal exports** | — |
| **Imports** | None |

URL-to-tag conversion using configurable patterns and fallback segment-based logic.

---

#### `fetch/state.{js,ts}`

| | |
|---|---|
| **Generator** | `fetch-state.ts` → `fetch-state.ts` |
| **Feature** | Always |
| **User exports** | `getFetchCount()` |
| **Internal exports** | `incrementFetchCount()`, `decrementFetchCount()` |
| **Imports** | None |

Global in-flight request counter. Used by `useIsFetching` hook and `fetchWithCache` to track loading state.

---

#### `reset.{js,ts}`

| | |
|---|---|
| **Generator** | `reset.ts` → `reset.ts` |
| **Feature** | Always |
| **User exports** | `resetSwoff()` |
| **Internal exports** | — |
| **Imports** | None |

Nuclear reset: clears all caches, IndexedDB databases, localStorage, and instructs the SW to re-precache.

---

#### `db.{js,ts}`

| | |
|---|---|
| **Generator** | `open-db.ts` → `open-db.ts` |
| **Feature** | Always |
| **User exports** | — |
| **Internal exports** | `openDB()` |
| **Imports** | None |

Generic IndexedDB open helper. Used by auth, mutation queue, and push modules.

---

#### `sw/template.js`

| | |
|---|---|
| **Generator** | `sw-template.ts` → `sw-template.ts` |
| **Feature** | Always |
| **Exports** | — (template, not a module) |
| **Imports** | None |

The SW shell with `// [[PLACEHOLDERS]]` that get replaced at build time by `generator.js`.

---

#### `sw/generator.js`

| | |
|---|---|
| **Generator** | `sw-generator-build.ts` → `sw-generator-build.ts` |
| **Feature** | Always |
| **Exports** | — (CLI script) |
| **Imports** | `fs`, `path` (Node built-ins) |

Build script: reads `template.js`, replaces placeholders with config values, writes the final `sw.js`. Run as `node swoff/sw/generator.js` after each build.

---

#### `swoff.d.ts`

| | |
|---|---|
| **Generator** | `type-definitions.ts` → `type-definitions.ts` |
| **Feature** | Only if `ts` |
| **Exports** | TypeScript ambient declarations for `FetchWithCacheOptions`, `MutationStatus`, `ResetSwoffOptions`, `GqlOptions`, window augmentations, etc. |
| **Imports** | None |

---

#### `GUIDE.md`

| | |
|---|---|
| **Generator** | `guide-generator.ts` → `guide-generator.ts` |
| **Feature** | Always |
| **Exports** | — (documentation) |
| **Imports** | None |

Project-specific markdown guide with links to feature docs and auth setup instructions.

---

### 2.2 Conditionally-Generated Files

---

#### `auth/store.{js,ts}` (feature: `auth.enabled`)

| | |
|---|---|
| **Generator** | `auth-store.ts` → `auth-store.ts` |
| **User exports** | `setAuth()`, `getAuth()`, `clearAuth()`, `isAuthValid()`, `withAuthHeaders()`, `isAuthUrl()`, `ensureValidAuth()` |
| **Internal exports** | `clearMemoryAuth()` |
| **Imports** | `../db`, `../auth/adapter`, `../auth/check`, `../auth/state`, `../reset`, `../mutation/queue` (if mutationQueue) |

Token/session in memory, user info in IndexedDB. The SW sends `AUTH_CLEARED` and `AUTH_FAILURE` messages that the client-injector's message handler processes.

---

#### `auth/adapter.{js,ts}` (feature: `auth.enabled`)

| | |
|---|---|
| **Generator** | `auth-adapter.ts` → `auth-adapter.ts` |
| **User exports** | `adapter` (object with `getHeaders`, `refresh`, `fetchUser`), `AuthData` (interface) |
| **Internal exports** | — |
| **Imports** | `./check` |

**User-editable file.** Maps swoff's auth infrastructure to the user's auth provider (cookie, bearer, or custom).

---

#### `auth/state.{js,ts}` (feature: `auth.enabled`)

| | |
|---|---|
| **Generator** | `auth-state.ts` → `auth-state.ts` |
| **User exports** | `getAuthState()` |
| **Internal exports** | — |
| **Imports** | None |

Detects four auth states: Online+Authenticated, Online+Unauthenticated, Offline+Authenticated (cached user), Offline+Unauthenticated.

---

#### `auth/check.{js,ts}` (feature: `auth.enabled`)

| | |
|---|---|
| **Generator** | `auth-check.ts` → `auth-check.ts` |
| **User exports** | `isAuthFailureResponse()` |
| **Internal exports** | — |
| **Imports** | None |

Single source of truth for 401 detection (shared between client and SW).

---

#### `mutation/queue.{js,ts}` (feature: `mutationQueue.enabled`)

| | |
|---|---|
| **Generator** | `mutation-queue.ts` → `mutation-queue.ts` |
| **User exports** | `queueMutation()`, `flushMutations()`, `getPendingCount()`, `getQueuePosition()`, `getQueueItems()` |
| **Internal exports** | `processMutationQueue()`, `clearQueue()` |
| **Imports** | `../db`, `../cache/invalidate`, `../auth/store` (if auth) |

IndexedDB-backed offline mutation queue with exponential backoff, batching, and auth retry.

---

#### `mutation/state.{js,ts}` (feature: `mutationQueue.enabled`)

| | |
|---|---|
| **Generator** | `mutation-state.ts` → `mutation-state.ts` |
| **User exports** | `trackMutation()`, `updateMutationState()`, `resolveMutation()`, `rejectMutation()`, `getMutationState()`, `clearMutationState()`, `getAllMutationStates()`, `getMutationCount()`, `onMutationStateChange()` |
| **Internal exports** | — |
| **Imports** | None |

In-memory mutation state tracker for per-mutation UI (loading spinners, error states).

---

#### `mutation/sync.{js,ts}` (feature: `mutationQueue.backgroundSync`)

| | |
|---|---|
| **Generator** | `background-sync.ts` → `background-sync.ts` |
| **User exports** | `syncWhenPossible()` |
| **Internal exports** | `retrySync()` |
| **Imports** | `./queue` |

Registers `navigator.sync.register()` for processing mutation queue after tab close.

---

#### `pwa/prompt.{js,ts}` (feature: `pwa.enabled`)

| | |
|---|---|
| **Generator** | `pwa-install.ts` → `pwa-prompt.ts` |
| **User exports** | `isInstallable()`, `promptInstall()` |
| **Internal exports** | `setupPwaInstall()` |
| **Imports** | None |

Captures `beforeinstallprompt`, dispatches `pwa-installable` / `pwa-installed` events.

---

#### `pwa/injector.{js,ts}` (feature: `pwa.enabled`)

| | |
|---|---|
| **Generator** | `pwa-install.ts` → `pwa-injector.ts` |
| **Exports** | Re-exports `setupPwaInstall` from `./prompt` |
| **Imports** | `./prompt` |

Thin re-export layer so client-injector imports from `./pwa/injector` instead of `./pwa/prompt` directly.

---

#### `server-push/client.{js,ts}` (feature: `serverPush.enabled`)

| | |
|---|---|
| **Generator** | `server-push.ts` → `server-push.ts` |
| **User exports** | `stopPushEvents()`, `isPushConnected()` |
| **Internal exports** | `startPushEvents()` |
| **Imports** | `../config` |

SSE or WebSocket client that receives server-pushed cache invalidation events.

---

#### `push-notification/index.{js,ts}` (feature: `pushNotifications`)

| | |
|---|---|
| **Generator** | `push.ts` → `push.ts` |
| **User exports** | `requestNotificationPermission()`, `getPushSubscription()`, `subscribeToPush()`, `unsubscribeFromPush()`, `isSubscribed()` |
| **Internal exports** | — |
| **Imports** | `../db` |

Push subscription management with IndexedDB persistence.

---

#### `graphql/index.{js,ts}` (feature: `graphql.enabled`)

| | |
|---|---|
| **Generator** | `gql-wrapper.ts` → `gql-wrapper.ts` |
| **User exports** | `fetchWithGql()`, `queryGql()`, `mutateGql()` |
| **Internal exports** | — |
| **Imports** | `../fetch/core`, `../cache/invalidate`, `../cache/tags`, `../config` |

GraphQL wrapper built on `fetchWithCache`. Hashes query + variables for cache keys, auto-generates tags from operation names.

---

### 2.3 React Hooks (`adapters/`)

Generated only when framework is one of: `react-spa`, `nextjs`, `remix`, `tanstack-start-react`, `astro`.

These files are copied from `templates/react/` — they are static templates, not generated from runtime code.

| Hook | Imports from | Purpose |
|---|---|---|
| `useCachedFetch` | `fetch/core`, `cache/tags` | React hook wrapping `fetchWithCache` with loading/error states |
| `useMutation` | `fetch/core`, `mutation/state` | React hook for mutations with optimistic state |
| `useCacheInvalidation` | `cache/invalidate`, `cache/tags` | React hook for invalidation helpers |
| `useNetworkStatus` | `connectivity` | Reactive online/offline status |
| `useAuth` | `auth/store`, `auth/state` | Auth state + login/logout helpers |
| `useMutationQueue` | `mutation/queue` | Queue status + flush control |
| `useMutationState` | `mutation/state` | Per-mutation state subscription |
| `usePrefetch` | `fetch/core` | Link hover prefetching |
| `useIsFetching` | `fetch/state` | Global loading indicator |
| `useStorageEstimate` | `storage` | Storage usage display |
| `usePwaInstall` | `pwa/prompt` | Installable state + prompt trigger |
| `useSWUpdate` | (none — listens for `sw-ready`) | SW update availability |
| `useSwoffReset` | `reset` | Reset with loading state |
| `useOfflineAnalytics` | (none — listens for `swoff:offline-fallback`) | Offline fallback tracking |
| `usePushSubscription` | `push-notification/index` | Push subscription UI |
| `useBackgroundSync` | `mutation/sync` | Background sync status |

---

## 3. Dependency Graph

```
client-injector.{js,ts}
├── sw/injector.{js,ts}              ← SW registration
├── connectivity.{js,ts}             ← Heartbeat + state
├── storage.{js,ts}                  ← Quota warning
├── pwa/injector.{js,ts}             ← [if pwa]  →  pwa/prompt
├── mutation/queue.{js,ts}           ← [if mutationQueue]  →  db + cache/invalidate + auth/store
├── auth/store.{js,ts}               ← [if auth]  →  db + adapter + check + state + reset + mutation/queue
└── server-push/client.{js,ts}       ← [if serverPush]  →  config

fetch/core.{js,ts}
├── config.{js,ts}
├── cache/tags.{js,ts}
├── cache/invalidate.{js,ts}
├── fetch/state.{js,ts}
├── auth/store.{js,ts}              ← [if auth]
└── mutation/queue.{js,ts}          ← [if mutationQueue]

cache/invalidate.{js,ts}
└── cache/tags.{js,ts}
```

### Key takeaway

**3 files are always needed** for SW registration: `sw/injector`, `connectivity`, `storage`. These must be inlined for a universal script approach.

**Everything else** depends on optional features and can be conditionally compiled.

---

## 4. Communication Protocol

All user-facing functions communicate with the Service Worker via two mechanisms:

### 4.1 HTTP Request Headers (fetchWithCache)

The `fetchWithCache` function sets these headers on every request. The SW reads them to determine caching behavior. **Any HTTP client** (native fetch, HTMX, XMLHttpRequest, Python, Go, etc.) can set these same headers and get the same caching behavior.

| Header | Purpose | Values |
|---|---|---|
| `X-SW-Type` | Read vs. mutation | `read` | `mutation` |
| `X-SW-Cache-Tags` | Custom cache tags | Comma-separated tag list |
| `X-SW-Strategy` | Per-request override | `cache-first` | `network-first` | `stale-while-revalidate` | etc. |
| `X-SW-Stale-Time` | Stale time override | Milliseconds |
| `X-SW-Refetch-Interval` | Refetch interval | Milliseconds |
| `X-SW-Refetch-On-Focus` | Refetch on tab focus | `true` | `false` |
| `X-SW-Refetch-On-Reconnect` | Refetch on reconnect | `true` | `false` |
| `X-SW-Invalidate-Tags` | Tags to invalidate after mutation | Comma-separated tag list |
| `X-SW-No-Queue` | Skip offline queuing | `true` |

### 4.2 postMessage to Service Worker (invalidation)

Functions like `invalidateByTag()`, `invalidateByTags()`, `invalidateMatching()`, and `getUrlsForTag()` communicate with the SW via `navigator.serviceWorker.controller.postMessage()`.

| Message Type | Direction | Purpose |
|---|---|---|
| `INVALIDATE_TAG` | Client → SW | Invalidate single cache tag |
| `INVALIDATE_MATCHING` | Client → SW | Invalidate by URL glob |
| `GET_URLS_FOR_TAG` | Client → SW | Introspect cached URLs |
| `GET_TAGS_FOR_URL` | Client → SW | Introspect tags for URL |
| `RESET_CACHE` | Client → SW | Clear + re-precache |
| `SKIP_WAITING` | Client → SW | Activate waiting SW |
| `FOCUS` | Client → SW | Tab gained focus (reactive strategy) |
| `INVALIDATE_TAG` (from SW) | SW → Client | Background invalidation event |
| `TAG_INVALIDATED` | SW → Client | Confirmation of tag invalidation |
| `RESET_CACHE_COMPLETE` | SW → Client | Reset finished |
| `CACHE_UPDATED` | SW → Client | Background refresh completed |
| `OFFLINE_FALLBACK_ACTIVATED` | SW → Client | Offline fallback served |
| `SW_PROGRESS` | SW → Client | Install progress |
| `AUTH_CLEARED` | SW → Client | Auth cleared in another tab |
| `AUTH_FAILURE` | SW → Client | 401 during background refetch |
| `MUTATION_STORED` | SW → Client | New mutation in IDB |
| `BACKGROUND_SYNC_PROGRESS` | SW → Client | Sync batch progress |
| `BACKGROUND_SYNC_COMPLETE` | SW → Client | Sync complete |

### 4.3 Window Custom Events (DOM)

The client-injector dispatches these events for framework-agnostic consumption:

| Event | Detail | Purpose |
|---|---|---|
| `sw-progress` | `{ percent, downloaded, total }` | SW install progress |
| `sw-ready` | none | SW active and controlling |
| `sw-error` | none | SW registration failed |
| `cache-invalidated` | `{ tags }` | Cache entries cleared |
| `swoff:cache-updated` | `{ url }` | Background refresh |
| `swoff:offline-fallback` | `{ route, fallbackLevel, timestamp }` | Offline fallback served |
| `swoff:notification` | `{ level, code, message }` | SW or storage notification |
| `swoff:reset-start` | none | Reset begun |
| `swoff:reset-complete` | `{ warnings }` | Reset finished |
| `mutation-sync-complete` | `{ succeeded, failed }` | Mutations synced |
| `mutation-sync-progress` | `{ succeeded, failed, total, current }` | Batch progress |
| `mutation-queue-changed` | none | Queue modified |
| `pwa-installable` | `{ isInstallable }` | PWA can be installed |
| `pwa-installed` | `{ outcome }` | User accepted install |
| `sw-auth-unauthorized` | none | Session expired |
| `sw-auth-state-change` | `{ authenticated }` | Login or logout |
