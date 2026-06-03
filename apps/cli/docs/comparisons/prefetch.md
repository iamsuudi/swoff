# Prefetch: Swoff vs Framework Built-Ins

Prefetch is the practice of fetching resources *before* the user navigates to them, so the response is already available when navigation happens. Every major meta-framework has a prefetch mechanism, but the storage layer, thread safety, offline behavior, and scope differ dramatically.

## How each system prefetches

### Swoff (`prefetchCache` / `usePrefetch`)

- **What is stored:** Full HTTP `Response` objects (headers + body) in the Cache Storage API.
- **Storage layer:** Service Worker Cache Storage (persistent, shared across all tabs).
- **Survives hard navigation?** Yes — the SW cache is disk-backed and persists across page reloads.
- **Works offline?** Yes — the cached response is served from the SW cache regardless of connectivity.
- **Thread:** Service Worker thread. `caches.match()` fires before any main-thread JS runs.
- **Trigger:** `prefetchCache(url)` is a fire-and-forget call; developers wire it to `onMouseEnter` or custom intent signals. No framework coupling.
- **Scope:** Any URL — API endpoints, images, third-party resources, GraphQL POST bodies. Not limited to route data.

### Next.js App Router (`<Link prefetch>` / `router.prefetch()`)

- **What is stored:** RSC Flight payloads (serialized React component trees) in an in-memory `CacheNode` tree.
- **Storage layer:** In-memory LRU-capped cache keyed by route segments (Router Cache / Segment Cache). Not the browser HTTP cache.
- **Survives hard navigation?** No — the in-memory `CacheNode` tree is wiped on page reload.
- **Works offline?** No — RSC payloads require server round-trips. No built-in SW integration.
- **Thread:** Main thread — prefetch scheduling, cache management, and RSC payload parsing.
- **Trigger:** On render for links in viewport (Intersection Observer); higher priority on hover/focus.
- **Scope:** Route RSC payloads only. Not general HTTP resources.

### TanStack Router (`preloadRoute()` / `defaultPreload`)

- **What is stored:** Route loader return values (arbitrary JS data) in an in-memory SWR cache (Map).
- **Storage layer:** In-memory Map keyed by route dependencies + params. Configurable `staleTime` (default 30s for preloads), `gcTime` (default 30 min).
- **Survives hard navigation?** No — in-memory cache is lost on reload.
- **Works offline?** Not by itself — you must integrate with a persister adapter or SW.
- **Thread:** Main thread — loader execution, cache reads/writes, route matching.
- **Trigger:** `"intent"` mode prefetches on hover/focus. Manual `router.preloadRoute()` API.
- **Scope:** Route loader return values only. Not general HTTP resources.

### Remix / React Router v7 (`<Link prefetch>`)

- **What is stored:** Route JS modules, CSS, and `.data` request payloads, all cached via the browser HTTP cache.
- **Storage layer:** Browser HTTP cache. `<link rel="prefetch">` tags cause the browser to fetch and cache the resource using standard HTTP caching rules.
- **Survives hard navigation?** Yes — the browser HTTP cache persists across reloads (subject to `Cache-Control` headers).
- **Works offline?** Partially — if `Cache-Control` headers are set appropriately, the browser HTTP cache serves prefetched data offline. But Remix does not ship a built-in SW.
- **Thread:** Main thread for DOM insertion of `<link>` tags; the actual fetch is managed by the browser's network stack.
- **Trigger:** `prefetch="intent"` (hover/focus, default), `"render"`, `"viewport"`, or `"none"`.
- **Scope:** Route-level JS, CSS, and `.data` loader responses. Not general HTTP resources.

### SvelteKit (`data-sveltekit-preload`)

- **What is stored:** Route JS modules (via dynamic `import()`) and `load` function return values (via `__data.json` requests).
- **Storage layer:** In-memory `load_cache` (Map keyed by route path) for data; JS module cache for code.
- **Survives hard navigation?** No — in-memory caches are wiped on reload. Prerendered pages (data in HTML) do survive.
- **Works offline?** Not via prefetch alone. SvelteKit has a separate SW API (`$service-worker`) for offline, but the prefetch cache is in-memory.
- **Thread:** Main thread — `fetch()` for `__data.json`, dynamic `import()` for code.
- **Trigger:** `data-sveltekit-preload-data="hover"` (on mouse rest), `"tap"` (on mousedown/touchstart). Code-only variants available.
- **Scope:** Route `load` data and JS modules only. Not general HTTP resources.

## Comparison table

| Dimension | Swoff | Next.js | TanStack Router | Remix (RRv7) | SvelteKit |
|---|---|---|---|---|---|
| **Storage** | SW Cache API (disk) | In-memory LRU | In-memory Map | Browser HTTP cache | In-memory Map |
| **Persists across hard nav?** | ✅ Yes | ❌ No | ❌ No | ✅ Yes (if `Cache-Control` allows) | ❌ No |
| **Works offline?** | ✅ Yes | ❌ No | ❌ Not built-in | 🟡 Partial (no SW provided) | 🟡 Via separate SW API |
| **Thread** | SW thread | Main thread | Main thread | Browser network stack (fetch) | Main thread |
| **Framework coupling** | None — any URL | Route RSC only | Route loader only | Route loader + assets only | Route loader + assets only |
| **Third-party API prefetch** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **POST / GraphQL prefetch** | ✅ Yes (body-hash) | ❌ No | ❌ No | ❌ No | ❌ No |
| **Trigger model** | Programmatic (`prefetchCache(url)`) | Viewport + hover (auto) | Hover/intent (auto or manual) | Hover/render/viewport (auto) | Hover/tap/viewport (auto) |
| **Runtime dependency** | 0 kB (generated code) | ~100 kB+ (Next.js) | ~20 kB (Router) | ~15 kB (React Router) | ~20 kB (SvelteKit) |

## Deep dive: what makes the difference

### Storage layer determines offline + hard-nav survival

The most impactful architectural choice is where the prefetched data lives:

- **Cache Storage API** (Swoff) — disk-backed, persisted across SW restarts and page reloads. The browser manages eviction by origin storage quota. Survives anything short of "Clear site data."
- **Browser HTTP cache** (Remix) — also disk-backed and reload-persistent, but controlled by `Cache-Control` headers. Prefetching via `<link rel="prefetch">` does not bypass the server's cache headers. If the server sends `Cache-Control: no-cache`, the prefetched response is never actually stored.
- **In-memory** (Next.js, TanStack Router, SvelteKit) — fast but ephemeral. Lost on tab close, page reload, or memory pressure. The data must be re-fetched after any hard navigation.

Swoff and Remix are the only two where a prefetched response survives a full page reload. But Swoff's Cache Storage API is the only one that works offline without relying on server `Cache-Control` cooperation.

### Thread isolation

Swoff's prefetch runs entirely in the Service Worker thread:
```
SW thread:  prefetchCache() → fetch → caches.put(url, response)
Main thread: user clicks → navigation → useCachedFetch() → caches.match(url) → instant
```

Next.js, TanStack Router, and SvelteKit process prefetches on the main thread, competing with rendering, event handling, and layout calculations. The main-thread cost of parsing RSC payloads (Next.js) or running loader functions (TanStack Router) adds latency to the critical rendering path.

### Framework coupling

Swoff's prefetch is URL-based, not route-data-based. This means:
- Prefetch an image: `prefetchCache("/hero.jpg")`
- Prefetch a GraphQL POST: `prefetchCache("/graphql", { method: "POST", body })`
- Prefetch a third-party API: `prefetchCache("https://api.example.com/data")`

All other frameworks restrict prefetch to route-level data that their router knows about. You cannot prefetch a random API endpoint, an image, or a third-party resource with Next.js's `<Link prefetch>` or TanStack Router's `preloadRoute()`.

### Coexistence with existing data fetches

If a `useCachedFetch("/api/notes")` is already active on the page, calling `prefetchCache("/api/notes")` is a no-op — the response is already in the SW cache. There's no double-fetch, no cache stampede, no wasted bandwidth.

Framework prefetches do not deduplicate against active fetches. Next.js's router cache and the app's data fetching (TanStack Query, SWR, etc.) are separate systems — both may independently request the same data.

## When to use each

**Choose Swoff prefetch when:**
- You need prefetched data to survive page reloads
- You need prefetched data to work offline
- You want prefetch to not compete with main-thread rendering (SW thread)
- You need to prefetch non-route resources (images, third-party APIs, GraphQL queries)
- You're using multiple frameworks or no framework at all

**Choose Next.js/TanStack Router/SvelteKit prefetch when:**
- You're already locked into that ecosystem and the simplifed `onMouseEnter` or viewport-based auto-prefetch is all you need
- You don't need offline or hard-nav survival
- You only ever need to prefetch route-level data
- You prefer the zero-config "it just works" auto-prefetch model

**Choose Remix/React Router prefetch when:**
- You need prefetch to survive page reloads (browser HTTP cache)
- Your server sets appropriate `Cache-Control` headers
- You don't need offline prefetch
- You want browser-native `<link rel="prefetch">` semantics

## Real-world impact

The Swoff pattern matters most for:

1. **Deep-link navigation** — User hovers a link to `/notes/123`. The SW caches the full response. When they click, the SW intercepts the navigation's `fetch()` and returns the cached response instantly — no network, no main-thread cache lookup.

2. **Slow networks** — The prefetch fires on `onMouseEnter`, which typically fires 200-500ms before the click. On a 3G connection, that's enough head start for the SW to complete the fetch and cache the response before navigation starts.

3. **Offline-first apps** — The SW cache serves prefetched content even when the device is offline. Framework in-memory caches (Next.js, TanStack Router, SvelteKit) cannot do this.

4. **Non-route prefetch** — Prefetching the next page's hero image, or warming a GraphQL cache for the next view, is a one-liner: `prefetchCache(url)`.
