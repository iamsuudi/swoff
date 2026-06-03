# Data Fetching: Swoff vs TanStack Query / SWR

The difference between data-fetching approaches lies in the *storage layer* and *thread* where caching happens — and these architectural choices cascade into offline support, hard-nav survival, bundle size, and framework coupling. Swoff's caching strategies and 3-tier resolution system are covered in [Caching & Data Layer](./caching-and-data.md). This doc focuses on the developer-facing API and the practical implications of SW-level vs in-memory caching.

## How Swoff does it

`useCachedFetch` is a thin React hook over `fetchWithCache`, which communicates with the Service Worker via the `fetch` event. The SW intercepts every request, applies the configured strategy, and stores responses in the Cache Storage API.

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
- **Storage layer:** Cache Storage API (disk-backed, persists across tab closes and hard navigations).
- **Thread:** Service Worker thread. Cache lookup, strategy logic, and background refresh don't block the main thread.
- **Offline:** Native. Cached responses served from the Cache Storage API regardless of connectivity. No additional setup.
- **Hard navigation:** Survives page reload. Previously cached responses are available on the next page load without any network request.
- **Bundle impact:** 0 kB. The hook is generated source code — no runtime library, no import from `node_modules`.
- **Framework coupling:** None. The same `fetchWithCache` + SW pipeline works with React, Vue, Svelte, Solid, HTMX, or vanilla JS.

```tsx
const { data, error, loading, refetch } = useCachedFetch<Note[]>("/api/notes", {
  auth: true,
  strategy: "stale-while-revalidate",
  staleTime: 30_000,
});
```

**Auto-refetch on invalidation:** When the SW confirms cache invalidation via `TAG_INVALIDATED`, the hook automatically refetches. Mutations on one page trigger refetches on all open tabs — no manual `invalidateQueries()` call needed.

## How TanStack Query / SWR handles it

TanStack Query and SWR are in-memory server-state caching libraries. They run on the main thread, store data in a JavaScript `Map`/`QueryCache`, and provide hooks for fetching, caching, revalidating, and deduplicating requests.

```tsx
const { data, error, isLoading } = useQuery({
  queryKey: ["notes"],
  queryFn: () => fetch("/api/notes").then((r) => r.json()),
});
```

**Key properties:**
- **Storage layer:** In-memory. Data is lost on tab close, page refresh, or memory pressure.
- **Thread:** Main thread. All cache reads, writes, and revalidation compete with rendering and event handling.
- **Strategies:** One strategy — stale-while-revalidate (with configurable `staleTime` and `gcTime`). Cannot intercept `fetch` at the SW level.
- **Offline:** Not natively offline. Requires a `persister` adapter (TanStack Query v5+) with separate configuration.
- **Hard navigation:** Does not survive page reload. All cached data is lost; the next load starts with empty cache.
- **Bundle impact:** ~3.8 kB gzip (TanStack Query) or ~3.3 kB gzip (SWR) + adapter + persister if needed.

## Comparison table

| Dimension | Swoff | TanStack Query | SWR |
|---|---|---|---|
| **Storage layer** | Cache Storage API (disk) | In-memory QueryCache (Map) | In-memory Map |
| **Survives hard navigation?** | ✅ Yes — SW cache persists | ❌ No — wiped on reload | ❌ No — wiped on reload |
| **Works offline?** | ✅ Yes — natively | 🟡 With persister adapter | ❌ No built-in support |
| **Thread** | SW thread (cache + strategy) | Main thread | Main thread |
| **Request deduplication** | ✅ 50ms batch window + in-flight Map | ✅ Per query key | ✅ Per key |
| **Cache key normalization** | ✅ Query param sorting + ignore config | ❌ Raw URL | ❌ Raw URL |
| **Auto-refetch on invalidation** | ✅ Built-in (listens to `cache-invalidated` event) | ❌ Manual `invalidateQueries()` | ❌ Manual `mutate()` |
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

When a user triggers a full page navigation, the browser creates a new document. Every in-memory cache is wiped — TanStack Query's `QueryCache`, SWR's internal Map, Next.js's Router Cache, TanStack Router's loader cache. The only caches that survive are disk-backed: the Cache Storage API (Swoff, Workbox) and the browser HTTP cache.

On the second page view (after navigating away and back), Swoff serves cached data immediately from the SW cache. TanStack Query and SWR must re-fetch every active query — Swoff shows data instantly, they show a loading spinner.

### Thread isolation

TanStack Query and SWR manage caching, revalidation, and deduplication on the main thread — competing with event handlers, layout calculations, and rendering. Swoff delegates all caching logic to the Service Worker thread:

- Cache lookups run in the SW thread, resolved by the browser's native Cache Storage implementation before any JavaScript executes.
- Strategy application runs in the SW `fetch` handler.
- Background refetches and cache writes run in the SW thread, invisible to the main thread.

The main thread only receives the final `Response` object. Cache management cost is effectively zero from the main thread's perspective.

### Offline

TanStack Query and SWR are online-first. Offline support requires a `persister` adapter to serialize the query cache to IndexedDB, a custom hook to intercept failed fetches and serve stale persisted data, and no SW integration — the persisted cache is only available to JavaScript, not to the native `fetch` event.

Swoff's offline support is native: the SW intercepts every `fetch` event, checks the Cache Storage API, and serves cached responses regardless of `navigator.onLine`. No persister, no adapter, no extra setup.

### Bundle cost

TanStack Query ships ~20 kB (minified) that must be downloaded, parsed, and executed on every page load. SWR ships ~10 kB. Both are runtime dependencies from `node_modules`.

Swoff's hooks are generated source code — nothing in `node_modules`. The generated code is tree-shaken by the bundler: unused hooks produce zero bytes in the final bundle. The total hook code for `useCachedFetch` is ~4 kB of generated TypeScript — less than SWR, no runtime dependency risk.
