# Swoff vs Other Offline/PWA Libraries

A feature-by-feature comparison of Swoff against other popular service worker and offline-first toolkits.

---

## Overview

| Library | Approach | Dependencies | Generated code | Last updated |
|---------|----------|-------------|---------------|--------------|
| **Swoff** | Build-time code generation from config | Zero runtime deps | Full source in `swoff/` | 2026 |
| **Workbox** | Build-time + runtime library | Requires `workbox-*` packages (15+ modules) | Injected into SW | 2026 |
| **vite-plugin-pwa** | Vite plugin wrapper around Workbox | Requires Workbox + vite plugin | Minimal, delegates to Workbox | 2026 |
| **upup** | Single JS include | One script tag | No generation | 2019 (unmaintained) |
| **PWA Builder** | Service worker generator (online) | Generated SW only | Generated once | 2025 |

---

## Feature Matrix

| Feature | Swoff | Workbox | vite-plugin-pwa | upup | PWA Builder |
|---------|-------|---------|-----------------|------|-------------|
| SW code generation | ✅ Full source | ✅ Partial (runtime) | ✅ Partial | ❌ Fixed script | ✅ Full source |
| Caching strategies | ✅ 5 strategies | ✅ 5 strategies | ✅ (via Workbox) | ✅ 3 strategies | ✅ Basic |
| Precaching | ✅ Auto from build | ✅ Auto from build | ✅ Auto from build | ❌ | ✅ |
| Runtime caching | ✅ Pattern-based | ✅ Pattern-based | ✅ Pattern-based | ❌ | ✅ |
| Auth integration | ✅ Built-in (bearer/cookie/custom) | ❌ Manual | ❌ Manual | ❌ | ❌ |
| Mutation queue | ✅ IndexedDB, configurable batching + backoff | ❌ Not provided | ❌ Not provided | ❌ | ❌ |
| Background sync | ✅ SW + client API | ✅ `workbox-background-sync` | ✅ (via Workbox) | ❌ | ❌ |
| Cross-tab sync | ✅ BroadcastChannel + localStorage | ❌ Not provided | ❌ Not provided | ❌ | ❌ |
| Tag-based cache invalidation | ✅ Auto-tags from URL, operation name | ❌ Not provided | ❌ Not provided | ❌ | ❌ |
| GraphQL support | ✅ `queryGql` / `mutateGql` with body hash caching | ❌ Not provided | ❌ Not provided | ❌ | ❌ |
| Push notifications | ✅ Client library + React hook | ❌ Not provided | ❌ Not provided | ❌ | ❌ |
| PWA install prompt | ✅ `pwa/install.ts` | ❌ Not provided | ✅ (via plugin) | ❌ | ❌ |
| Framework hooks | ✅ React (auth, cached fetch, mutation queue, etc.) | ✅ `workbox-window` (minimal) | ✅ (via Workbox) | ❌ | ❌ |
| TypeScript support | ✅ Full type declarations | ✅ Typed | ✅ Typed | ❌ | ❌ |
| Zero runtime deps | ✅ All code is generated, no imports from library | ❌ Requires runtime modules | ❌ Requires Workbox | ✅ Single script | ✅ |
| Auditable generated code | ✅ Full source in `swoff/` | ❌ Obfuscated runtime | ❌ Obfuscated runtime | ✅ | ✅ |
| Config-driven | ✅ `swoff.config.json` | ✅ `workbox-config.js` | ✅ Vite plugin config | ❌ | ❌ |
| Build tool agnostic | ✅ Works with any build tool (Vite, Webpack, etc.) | ✅ Works with any | ❌ Vite only | ✅ Any | ✅ Any |

---

## Detailed Comparison

### 1. Service Worker Generation

**Swoff** generates a full, human-readable service worker from `swoff.config.json`. The SW source (`sw/template.js`) contains all caching logic with placeholders that are replaced at build time with actual asset hashes and version info. Every line is visible and editable.

**Workbox** injects a small runtime into your SW that loads `workbox-*` modules at runtime. The generated SW is opaque — you control behavior through Workbox APIs but can't easily read or modify the generated code.

**vite-plugin-pwa** is a thin Vite plugin that wraps Workbox. Same opaque runtime approach, but integrated into the Vite build pipeline.

### 2. Caching Strategies

Both Swoff and Workbox offer the same 5 strategies (cache-first, network-first, stale-while-revalidate, cache-only, network-only). Swoff resolves strategy through a 3-tier priority (per-request → URL pattern → default), which is similar to Workbox's route-based approach.

**Key difference:** Swoff supports `stale-while-revalidate` at the request level via `fetchWithCache(options)`, while Workbox requires separate route registration for each strategy.

### 3. Auth Integration

**Swoff** has first-class auth support:
- Three auth types: `bearer`, `cookie`, `custom`
- Automatic token injection via `fetchWithCache(url, { auth: true })`
- Automatic 401 detection → `clearAuth()` + `sw-auth-unauthorized` event
- Token refresh via `ensureValidAuth()`
- Offline user caching via IndexedDB
- Auth state detection (4 states: online+authed, online+guest, offline+authed, offline+guest)

**Workbox** provides no auth primitives — you must implement token management, header injection, and 401 handling yourself in your application code.

### 4. Mutation Queue (Offline Writes)

**Swoff** includes a full offline mutation queue:
- Queues POST/PUT/DELETE to IndexedDB when offline
- Replays on `online` event
- Configurable batch size (progress events), delay between mutations (rate limiting), max retries, and exponential backoff
- Auth headers are re-fetched at replay time (handles token expiry during offline periods)
- Service worker background sync processes even after tab close
- Custom events (`mutation-queue-changed`, `mutation-sync-complete`) for UI updates

**Workbox** provides `workbox-background-sync` for replaying failed requests, but it lacks batching, rate limiting, backoff, and auth-aware replay.

**Libraries without this feature:** upup, PWA Builder, vite-plugin-pwa (without Workbox BG sync plugin).

### 5. Cache Invalidation (Tag-based)

**Swoff** implements tag-based cache invalidation:
- URLs are automatically parsed into resource tags (`/api/todos/42` → `["todos", "todo:42"]`)
- After a mutation, matching cache entries are purged and background-refetched
- If refetch fails, the stale entry is served with stale-while-revalidate fallback
- Cross-tab invalidation: when one tab invalidates, all tabs re-fetch

**No other library** provides tag-based invalidation. Workbox has no invalidation primitive — you must manually delete caches by name or implement your own tagging system.

### 6. GraphQL Support

**Swoff** is the only library with native GraphQL support:
- `queryGql()` / `mutateGql()` functions that share the same caching, auth, and offline queue as REST
- Query bodies are SHA-256 hashed for deterministic cache keys (sent as `X-SW-Cache-Key` header)
- Virtual cache URLs (`/__swc/gql:<hash>`) prevent collisions between different queries to the same endpoint
- Operation names auto-generate invalidation tags (`getTodos` → `["todos"]`, `createTodo` → `["todos", "todo"]`)

**Workbox** and others require manual workarounds — using POST body as part of the cache key is not natively supported.

### 7. Cross-Tab Sync

**Swoff** synchronizes auth state and cache invalidations across open tabs using `BroadcastChannel` API with a `localStorage` fallback. When a user logs out in one tab, all other tabs detect the change immediately. Cache invalidations triggered in one tab cause background refetches in all tabs.

**No other library** provides cross-tab synchronization for auth or cache state.

### 8. Push Notifications

**Swoff** generates a complete push notification client:
- `subscribeToPush()` with VAPID support
- `unsubscribeFromPush()` with IndexedDB persistence
- `usePushSubscription()` React hook
- Subscription state survives page refresh (IndexedDB)

**Workbox** does not provide push subscription management — you must implement it yourself.

### 9. Framework Hooks

**Swoff** generates framework-specific hooks when the configured framework is React:

| Hook | Purpose |
|------|---------|
| `useAuth()` | Reactive auth + connectivity state |
| `useCachedFetch()` | Auto-refetch on cache invalidation events |
| `useMutationQueue()` | Queue status (`pending`, `lastSync`) |
| `usePushSubscription()` | Push subscription toggle |
| `useSWUpdate()` / `useSWProgress()` | SW update lifecycle |
| `useNetworkStatus()` | Reactive online/offline |
| `useBackgroundSync()` | BG sync support detection |
| `useCacheInvalidation()` | Stable invalidation callbacks |

**Workbox** provides `workbox-window` with minimal SW lifecycle events (`installed`, `waiting`, `activated`). No data-fetching or auth hooks.

### 10. Zero Runtime Dependencies

**Swoff** generates all code as plain JS/TS files in `swoff/`. There are no runtime imports from the `@swoff/cli` package — the CLI is only used at build time. The generated code uses only browser APIs (IndexedDB, Cache API, Push API, BroadcastChannel, etc.).

**Workbox** requires importing modules at runtime (e.g., `import { precacheAndRoute } from 'workbox-precaching'`). The full Workbox suite includes 15+ packages.

---

## When to Choose Each

### Choose Swoff if:

- You want **offline-first** with auth, mutation queue, and cache invalidation out of the box
- You need **GraphQL** support with proper caching
- You want **auditable, editable** generated code (not a black box)
- You want **zero runtime dependencies** — no extra imports in your bundle
- You need **cross-tab sync** for auth state and cache
- You want a **config-driven** approach with a single JSON file
- You're building a **data-driven app** (notes, todos, dashboards) where offline writes matter
- You want **framework hooks** that reactively connect to SW events

### Choose Workbox if:

- You need battle-tested, Google-maintained SW infrastructure
- You want the most **flexible caching** with custom plugins
- You're okay with **runtime imports** and a larger bundle
- You don't need auth, mutation queue, or GraphQL support
- You want to build your own offline abstractions on top of basic SW primitives

### Choose vite-plugin-pwa if:

- You're already using Workbox and want a **Vite-native** integration
- You want **zero-config** PWA setup for a Vite project
- Your app is primarily static content (few mutation-heavy features)

### Choose upup if:

- You need a **dead-simple** offline solution for a static site
- You don't need auth, mutations, or any dynamic data
- You're okay with an unmaintained library

---

## Summary

Swoff differentiates itself by being a **complete offline-first toolkit** rather than just a service worker generator. It solves problems that Workbox deliberately leaves to application code: auth integration, offline mutation queuing, tag-based cache invalidation, cross-tab sync, GraphQL caching, and push subscription management — all with zero runtime dependencies and fully auditable generated code.
