# Swoff Integration Guide

This guide explains every file and feature Swoff generated for your project.
Each section answers: **What is it?**, **What files were created?**, **How to use it?**, **Where to edit?**


## 📦 Service Worker Registration
The service worker handles caching, offline support, background sync, and PWA installability.

### `client-injector.ts` — Single entry point
This is the **only file you need to import** at app startup to enable all Swoff features.
```ts
import { initServiceWorker } from "./swoff/client-injector.ts";
initServiceWorker();
```
It wires together: SW registration, PWA install prompt, mutation queue online listener, and cross-tab sync.

### `sw/injector.ts` — SW registration logic
Handles registering the service worker, checking for updates via version.json, and dispatching
update-available / ready / error events on the window.

**Functions:**
- `initServiceWorker()` — registers the SW and checks for updates
- `handleUpdateApproved(version)` — accepts a pending update and reloads on activation
- `skipWaiting()` — activates a waiting SW without reloading


## ⏱️ Stale Time — fresh vs stale data
`staleTime` controls how long cached data is considered **fresh** before it becomes **stale**.
When data is fresh, the SW serves it immediately from cache — no network request.
When data is stale, the SW serves the cached copy but triggers a **background refresh**,
so the next read returns fresh data.

**3-tier staleTime resolution (like strategies):**
1. **Per-request** — `fetchWithCache(url, { staleTime: 30 })` overrides everything
2. **Route pattern** — `"/api/*": { staleTime: 60 }` in `swoff.config.json`
3. **Global default** — `features.serviceWorker.staleTime`

**How staleTime changes each strategy:**
| Strategy | Fresh data (within staleTime) | Stale data (past staleTime) |
|----------|------------------------------|----------------------------|
| `cache-first` | Serve from cache, no network | Serve from cache + background refresh |
| `network-first` | Serve from cache, skip network | Try network first, fall back to cache |
| `stale-while-revalidate` | Serve from cache, no refresh | Serve + background refresh (was always-refresh) |
| `cache-only` | Serve from cache | Serve from cache + best-effort refresh |
| `network-only` | No effect | No effect |


## 🔄 Online refetch — recover stale cache after connectivity loss
When the browser fires the `online` event, `client-injector` forwards it to the SW.
The SW iterates its runtime cache and refetches any stale entries (batched & rate-limited).
This is the only refetch trigger — no window focus, no intervals, no polling.

### React Hook: `useMutation`
Track mutation state (loading, error, success) per-operation.
```tsx
import { useMutation } from "./swoff/hooks/useMutation.tsx";

const { mutate, isLoading, isError, isSuccess, data, error, reset } = useMutation({
  onSuccess: (data) => console.log('done', data),
  onError: (err) => console.error('failed', err),
});

mutate("/api/todos", { method: "POST", body: JSON.stringify({ title: "New" }) });
```

### React Hook: `usePrefetch`
Warm the cache proactively, e.g., on link hover.
```tsx
import { usePrefetch } from "./swoff/hooks/usePrefetch.tsx";

const prefetch = usePrefetch();
return <a onMouseEnter={() => prefetch("/api/todos")} href="/todos">Todos</a>;
```


## 🌐 fetchWithCache — API calls with caching
A drop-in replacement for `fetch()` that communicates with the service worker about caching strategy.
GET requests are cached by the SW for offline access; POST/PUT/DELETE pass through.

**Important:** Use `fetchWithCache` for all API calls — it sets the `X-SW-Cache-Strategy` header that
the SW uses to determine whether to apply a caching strategy. Plain `fetch()` works for uncached requests,
but if `cacheStrategy` is set to `"explicit-only"`, the SW will skip plain `fetch()` calls entirely.

### `fetch-wrapper.ts`
```ts
import { fetchWithCache } from "./swoff/fetch-wrapper.ts";

// GET — cached for offline
const todos = await fetchWithCache("/api/todos").then(r => r.json());

// POST — passes through to server
await fetchWithCache("/api/todos", {
  method: "POST",
  body: JSON.stringify({ title: "New task" }),
});
```

**Functions:**
- `fetchWithCache(input, options?)` — main fetch wrapper. Use for all API calls.
- `fetchWithCache(input, options?)` — unified fetch wrapper. Auto-queues writes when offline (disable with `queueOffline: false`).

**Returns** `{ response: Response, fromCache: boolean }` — `fromCache` lets the UI show stale indicators when a stale-while-revalidate fallback is served.

**Note:** For authenticated requests, pass `{ auth: true }` — there is no separate auth fetch wrapper.

### React Hook: `useCachedFetch`
Re-fetches automatically when the SW invalidates related cache tags.
```tsx
import { useCachedFetch } from "./swoff/hooks/useCachedFetch.tsx";

const { data, error, loading, refetch } = useCachedFetch<Todo[]>("/api/todos");
```

**Returns** `{ data: T | null, error, loading, refetch }` — `data` is the parsed JSON response.

The hook listens for `cache-invalidated` events (when tag invalidation is enabled) and automatically
re-fetches if the event's tags match the URL. Call `refetch()` to manually refresh.

### Dependent queries
Use `enabled: false` or pass a nullable URL to skip fetching until a condition is met.
When `enabled` becomes `true` or the URL becomes non-null, the query automatically starts fetching.
```tsx
const { data: user } = useCachedFetch<User>("/api/me");
const { data: posts } = useCachedFetch<Post[]>(user ? "/api/posts" : null);
// or
const { data: posts2 } = useCachedFetch<Post[]>("/api/posts", { enabled: !!user });
```

### Query cancellation (AbortController)
`fetchWithCache` integrates with the dedup map so duplicate requests are automatically deduplicated.
Pass an AbortSignal to cancel an in-flight request:
```tsx
useEffect(() => {
  const ctrl = new AbortController();
  fetchWithCache("/api/search", { signal: ctrl.signal });
  return () => ctrl.abort();
}, [query]);
```

### React Hook: `useNetworkStatus`
Tracks online/offline state reactively.
```tsx
import { useNetworkStatus } from "./swoff/hooks/useNetworkStatus.tsx";

const online = useNetworkStatus();
```

**Returns** `boolean` — `true` when online, `false` when offline.


## 🎯 Cache Strategy Resolution
The SW uses a 3-tier priority system to determine which caching strategy applies to each request:

1. **Per-request override (highest)** — set `strategy` on `fetchWithCache()`.
   Sent as `X-SW-Strategy` header to the SW.
2. **URL pattern match** — configured in `swoff.config.json` under `features.serviceWorker.strategies`.
   e.g. `"/api/*": "network-first"` matches all paths starting with `/api/`.
3. **Default (lowest)** — `features.serviceWorker.defaultStrategy` (default: `"cache-first"`).

### Cache strategy mode
The `features.serviceWorker.cacheStrategy` option controls when strategies are invoked:

- `"all"` (default): every GET/HEAD request goes through strategy dispatch, including plain `fetch()` calls.
- `"explicit-only"`: only requests with an `X-SW-Cache-Strategy` header (set automatically by `fetchWithCache()`)
  are processed by the SW strategy system. Plain `fetch()` calls pass through unmodified.

### Request dispatch flow
Each GET/HEAD request follows this path through the SW:

```
navigation (SPA fallback) → precache check → strategy dispatch → network pass-through
```

### Available strategies

| Strategy | Behavior (without staleTime) | Behavior (with staleTime) | Best for |
|----------|------------------------------|---------------------------|----------|
| `cache-first` | Return cached if available, else fetch + cache. Default | Fresh: pure cache. Stale: cache + bg refresh | Static assets, images, fonts |
| `network-first` | Try network, cache on success, fall back to cache | Fresh: pure cache (skip network!). Stale: try network | API endpoints, dynamic content |
| `stale-while-revalidate` | Return cached immediately, refresh in background | Fresh: pure cache (no refresh). Stale: cache + bg refresh | Fast UI, non-critical data |
| `cache-only` | Serve from cache only (404 if missing) | Fresh: pure cache. Stale: cache + best-effort refresh | Offline-critical assets |
| `network-only` | Always fetch, never cache | No effect | Sensitive or real-time data |


## 🏷️ Tag Invalidation — keep cached data fresh
When data changes on the server, cached responses in the SW become stale. Tag invalidation
lets you mark related cache entries as stale so they're re-fetched on next request.

### How it works
1. When fetching, attach tags: `fetchWithCache(url, { tags: generateTags(url) })`
2. After a mutation, invalidate: `await invalidateUrl(url)`
3. The SW removes all cached responses that were tagged with the related tags

### `invalidation-tags.ts` — Tag generation helpers
```ts
import { generateTags, invalidateUrl } from "./swoff/invalidation-tags.ts";

// Tag reads
const data = await fetchWithCache("/api/todos", { tags: generateTags("/api/todos") });

// Invalidate after writing
await invalidateUrl("/api/todos/42");
```

**Functions:**
- `generateTags(url)` — extract tags from a URL path. e.g. `/api/todos/42` → `["todos", "todo:42"]`
- `generateTagsFromMethod(method, url)` — method-prefixed tags. e.g. `post-todos`
- `invalidateUrl(url)` — extract tags and invalidate all matching cache entries
- `invalidateByMethod(method, url)` — invalidate using method-prefixed tags

### `cache.ts` — Low-level invalidation
```ts
import { invalidateByTag, invalidateByTags } from "./swoff/cache.ts";

await invalidateByTag("todos");
await invalidateByTags(["todos", "categories"]);
```

**Functions:**
- `invalidateByTag(tag)` — invalidate a single tag. Dispatches `cache-invalidated` event.
- `invalidateByTags(tags)` — invalidate multiple tags.

### React Hook: `useCacheInvalidation`
Reactive wrapper around cache invalidation functions.
```tsx
import { useCacheInvalidation } from "./swoff/hooks/useCacheInvalidation.tsx";

const { invalidateByTag, invalidateByTags, invalidateUrl } = useCacheInvalidation();
```

Returns stable `useCallback`-wrapped versions of each invalidation function.


## 🔄 Cross-tab Sync — keep tabs in sync
When the user opens your app in multiple browser tabs, changes in one tab (logout, mutation sync)
are broadcast to all other tabs via the service worker.

No separate imports needed — this is handled automatically by `client-injector.ts`.
The service worker listens for invalidation events and forwards them to all clients.


## 📱 PWA — installable web app
Swoff adds a beforeinstallprompt handler and install flow so users can install your app
on their home screen.

### `pwa/install.ts`
```ts
import { setupPwaInstall, isInstallable, promptInstall } from "./swoff/pwa/install.ts";

setupPwaInstall(); // called automatically by client-injector.ts

// Show install button when available
if (isInstallable()) {
  const { outcome } = await promptInstall();
}
```

**Functions:**
- `setupPwaInstall()` — listen for beforeinstallprompt/appinstalled events (called by client-injector)
- `isInstallable()` — check if install prompt is available
- `promptInstall()` — show the native install prompt

### `manifest.json`
Generated in `swoff/manifest.json`. If you want it exposed at the root, copy it to your `public/` directory.

### React Hooks
- `useSWUpdate()` — returns `{ updateStatus, currentVersion, availableVersion, forceUpdate, error, acceptUpdate, dismissUpdate }`
- `useSWProgress()` — returns `{ status, progress }` for download progress during SW update
- `useCachedFetch(url, options?)` — fetches with auto-refetch on tag invalidation, see Fetch Wrapper section


## 🏗️ Build script
The SW generator must run after every build to produce the final service worker file.
Swoff has already added this to your `package.json` build script for you:
```
"build": "<your-build> && node swoff/sw/generator.js"
```
If you run `swoff clean`, this script suffix will be removed automatically.


## ⚙️ swoff.config.json
This is the configuration file that controls which features are enabled and how they behave.
Re-run `npx @swoff/cli generate` after changing it.

### Features you can toggle:
- `mutationQueue.enabled` — offline write queue with IndexedDB. Object: `{ enabled, batchSize, batchDelayMs, maxRetries, retryBackoffMs }`
- `backgroundSync` — Background Sync API (Chrome/Edge only)
- `auth.enabled` — auth module (bearer/cookie/custom)
- `crossTabSync` — broadcast changes across tabs
- `tagInvalidation` — cache invalidation by tags
- `graphql.enabled` — GraphQL wrapper with body-hash caching. Object: `{ enabled, endpoint }`
- `pwa.enabled` — PWA install prompt and manifest
- `serverPush.enabled` — real-time cache invalidation via SSE/WebSocket. Object: `{ enabled, type, endpoint, reconnectDelayMs }`
- `serviceWorker.cacheStrategy` — caching strategy mode (`"all"` or `"explicit-only"`)
- `serviceWorker.defaultStrategy` — default caching strategy
- `serviceWorker.strategies` — per-route strategy overrides
- `serviceWorker.staleTime` — global stale time in seconds (data considered fresh for N seconds). Applies to cache-first and network-first only.
- `serviceWorker.refetchBatchSize` — max stale cache entries to refetch per batch

---