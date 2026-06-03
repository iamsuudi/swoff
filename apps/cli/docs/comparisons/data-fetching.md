# Data Fetching: Swoff vs TanStack Query / SWR

Data fetching is the most fundamental feature of any modern web app. The difference between libraries lies in the *storage layer* and *thread* where caching happens — and these architectural choices cascade into every other capability: offline support, hard-nav survival, bundle size, and framework coupling.

## How each system works

### Swoff (`useCachedFetch`)

`useCachedFetch` is a thin React hook over `fetchWithCache`, which communicates with the Service Worker via the `fetch` event. The SW intercepts every request, applies the configured caching strategy, and stores responses in the Cache Storage API.

```
useCachedFetch("/api/notes")
  → fetchWithCache("/api/notes")
    → SW fetch event handler
      → applies strategy (cache-first / network-first / stale-while-revalidate / etc.)
      → caches or serves from Cache Storage API
      → returns Response to client
  → useCachedFetch sets data/error/loading state
```

**Key properties:**

- **Storage layer:** Cache Storage API (disk-backed, persists across SW restarts, tab closes, and hard navigations).
- **Thread:** Service Worker thread. The SW handles cache lookup, strategy logic, and background refresh without blocking the main thread.
- **Strategies:** 6 built-in strategies (`cache-first`, `network-first`, `stale-while-revalidate`, `cache-only`, `network-only`, `reactive`) configurable globally, per-route-pattern, or per-request via a 3-tier resolution system.
- **Offline:** Works natively. Cached responses are served from the Cache Storage API regardless of connectivity. No additional setup.
- **Hard navigation:** Survives page reload. Prefetched and previously cached responses are available on the next page load without any network request.
- **Bundle impact:** 0 kB. The hook is generated source code in the project's `swoff/adapters/` directory — no runtime library, no import from node_modules.
- **Framework coupling:** None. The same `fetchWithCache` + SW pipeline works with React, Vue, Svelte, Solid, HTMX, or vanilla JS. React hooks are one adapter among many.

```tsx
const { data, error, loading, refetch } = useCachedFetch<Note[]>("/api/notes", {
  auth: true,
  strategy: "stale-while-revalidate",
  staleTime: 30_000,
  onSuccess: (data) => console.log("Loaded", data.length, "notes"),
});
```

**Auto-refetch on invalidation:** When the SW confirms cache invalidation via `TAG_INVALIDATED` message, the hook automatically refetches. This means mutations on one page trigger refetches on all open tabs — no manual `invalidateQueries()` call needed.

### TanStack Query / SWR

TanStack Query (formerly React Query) and SWR are in-memory server-state caching libraries. They run entirely on the main thread, store data in a JavaScript `Map`, and provide hooks for fetching, caching, revalidating, and deduplicating requests.

```tsx
const { data, error, isLoading } = useQuery({
  queryKey: ["notes"],
  queryFn: () => fetch("/api/notes").then((r) => r.json()),
});
```

**Key properties:**

- **Storage layer:** In-memory JavaScript `Map` (SWR) or an in-memory `QueryCache` (TanStack Query). Data is lost on tab close, page refresh, or memory pressure.
- **Thread:** Main thread. All cache reads, writes, serialization, and revalidation compete with rendering and event handling.
- **Strategies:** One strategy — stale-while-revalidate (with configurable `staleTime` and `gcTime`). There is no concept of cache-first, network-first, cache-only, or other SW-level strategies because the library cannot intercept `fetch` at the SW level.
- **Offline:** Not natively offline. The in-memory cache only contains data fetched during the current session. With a `persister` adapter (TanStack Query v5+), data can be persisted to IndexedDB or localStorage, but this requires a separate persistence configuration and adds complexity.
- **Hard navigation:** Does not survive page reload. All cached data is lost when the browser navigates away from the page. The next load starts with empty cache and fetches everything fresh.
- **Bundle impact:** 3.8 kB gzip (TanStack Query) or 3.3 kB gzip (SWR) + any adapter (React, Vue, etc.) + persister if needed.
- **Framework coupling:** Library-specific adapters. React Query, Vue Query, Solid Query, Svelte Query — each ships a separate package.

## Comparison table

| Dimension | Swoff | TanStack Query | SWR |
|---|---|---|---|
| **Storage layer** | Cache Storage API (disk) | In-memory QueryCache (Map) | In-memory Map |
| **Survives hard navigation?** | ✅ Yes — SW cache persists | ❌ No — wiped on reload | ❌ No — wiped on reload |
| **Works offline?** | ✅ Yes — natively | 🟡 With persister adapter | ❌ No built-in support |
| **Thread** | SW thread (cache + strategy) | Main thread | Main thread |
| **Caching strategies** | 6 (cache-first, network-first, SWR, cache-only, network-only, reactive) | 1 (SWR via `staleTime`) | 1 (SWR via `staleTime`) |
| **3-tier config resolution** | ✅ Per-request → route pattern → global | ❌ Query-key level only | ❌ Global defaults only |
| **Request deduplication** | ✅ 50ms batch window + in-flight Map | ✅ Per query key | ✅ Per key |
| **Cache key normalization** | ✅ Query param sorting + ignore config | ❌ Raw URL | ❌ Raw URL |
| **Tag-based invalidation** | ✅ URL-derived + custom tags, cascading, glob | ✅ Query-key based | ❌ mutate-based |
| **Auto-refetch on SW invalidation** | ✅ Built-in (listens to `cache-invalidated` event) | ❌ Manual `invalidateQueries()` | ❌ Manual `mutate()` |
| **Cross-tab cache sync** | ✅ SW broadcasts to all clients | 🟡 Limited via `focus` refetch | ❌ Not supported |
| **SSR-safe** | ✅ All generated modules guard browser globals | ✅ Built-in support | ✅ Built-in support |
| **Runtime bundle cost** | 0 kB (generated source) | ~20 kB + deps (minified) | ~10 kB (minified) |
| **Query cancellation** | ✅ AbortController via `signal` | ✅ AbortController via `signal` | ✅ AbortController via `signal` |
| **Select / transform** | ✅ `select` option (re-render guard) | ✅ `select` option | ✅ Middleware |
| **Placeholder / keepPreviousData** | ✅ Both | ✅ Both | 🟡 `keepPreviousData` only |
| **Retry on error** | ✅ Configurable count / Infinity | ✅ Configurable + exponential backoff | ✅ Configurable (SWR 2.x) |
| **Devtools** | ❌ None | ✅ Browser extension, query inspector | 🟡 React DevTools only |
| **Framework support** | React (generated) + Vue/Svelte/Solid planned | React, Vue, Svelte, Solid (separate packages) | React only + Vue (via @swr/vue) |

## Deep dive: what the storage layer means in practice

### Hard navigation survival

When a user clicks a link that triggers a full page navigation (not an SPA soft nav), the browser creates a new document. Every in-memory cache is wiped. This includes:

- TanStack Query's `QueryCache`
- SWR's internal Map
- Next.js's Router Cache (`CacheNode` tree)
- TanStack Router's loader cache

The only caches that survive are disk-backed: the Cache Storage API (Swoff, Workbox) and the browser HTTP cache (Remix via `<link rel="prefetch">`).

This means: on the *second* page view (after a navigation away and back), Swoff serves cached data immediately from the SW cache. TanStack Query and SWR must re-fetch every active query. The difference is most visible on repeat visits to a page — Swoff shows data instantly; TanStack Query shows a loading spinner until the fetch completes.

### Thread isolation

TanStack Query and SWR manage caching, revalidation, and deduplication on the main JavaScript thread. Every `setData`, `invalidateQueries`, `refetch`, and background revalidation runs on the same thread as event handlers, layout calculations, and rendering.

Swoff delegates caching logic to the Service Worker thread:

- Cache lookups (`caches.match()`) run in the SW thread, resolved by the browser's native Cache Storage implementation before any JavaScript executes.
- Strategy application (should I serve cache vs fetch network vs revalidate?) runs in the SW `fetch` handler.
- Background refetches and cache writes run in the SW thread, invisible to the main thread.

The main thread only receives the final `Response` object. The cost of cache management is effectively zero from the main thread's perspective.

### Offline

TanStack Query and SWR are online-first libraries. Their default mode assumes network connectivity. Offline support requires:
1. A `persister` adapter to serialize the query cache to IndexedDB (TanStack Query v5+).
2. A custom hook or middleware to intercept failed fetches and serve stale persisted data.
3. No SW integration — the persisted cache is only available to the same origin's JavaScript, not to the native `fetch` event.

Swoff's offline support is native: the SW intercepts every `fetch` event, checks the Cache Storage API, and serves cached responses regardless of `navigator.onLine`. No persister, no adapter, no extra setup.

### Bundle cost

TanStack Query ships ~20 kB (minified) of JavaScript that must be downloaded, parsed, and executed on every page load. SWR ships ~10 kB. These are runtime dependencies — they live in `node_modules` and are bundled by the build tool.

Swoff's hooks are generated source code in the project's `swoff/adapters/` directory. There is nothing in `node_modules`. The generated code is tree-shaken by the bundler: unused hooks produce zero bytes in the final bundle. The total hook code for `useCachedFetch` is ~4 kB of generated TypeScript — less than SWR, no runtime dependency risk.

## When to choose what

**Choose Swoff when:**
- You need cached data to survive page reloads (hard navigation)
- You need offline support without adding persisters or adapters
- You want the main thread free of cache management overhead
- You want to share caching infrastructure across frameworks or with non-React parts of your app
- You want multiple caching strategies (cache-first for static data, network-first for live data, reactive for real-time) without swapping libraries
- You want cache invalidation to automatically trigger refetches across all tabs via the SW
- You want zero runtime dependencies and minimal bundle impact

**Choose TanStack Query / SWR when:**
- You want a rich devtools ecosystem (TanStack Query Devtools)
- You need normalized cache updates (one mutation updates all queries referencing the same entity)
- You need optimistic updates with automatic rollback
- You are in a fully React/Vue/Svelte ecosystem and have no need for cross-framework caching
- You don't need offline support or hard-nav cache survival
- You want the mature ecosystem of plugins, adapters, and community patterns
