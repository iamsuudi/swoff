# Caching Strategies: SW-Level vs App-Level

Caching strategies determine when the system serves a cached response vs fetches from the network. The fundamental difference between Swoff and other tools is *where* the strategy executes: in the Service Worker thread at the `fetch` event, or in JavaScript on the main thread.

## How Swoff does it

Swoff implements 6 caching strategies that execute in the SW `fetch` event handler, configured through a 3-tier resolution system:

**The 6 strategies:**

| Strategy | Behavior |
|---|---|
| `cache-first` | Return cached response immediately. Fetch network in background to update cache. Never show stale data for longer than the last successful fetch. |
| `network-first` | Try network. On failure, serve cache. Best for live data with offline fallback. |
| `stale-while-revalidate` | Serve cached (even if stale), then fetch network in background. Best for data that doesn't change frequently. |
| `cache-only` | Serve only from cache. No network fetch. Useful for precached assets. |
| `network-only` | Always fetch from network. Never cache. Best for non-cacheable data (auth, nonces). |
| `reactive` | Serve cache if within `staleTime`, otherwise fetch network + cache. Combines `cache-first` with a freshness threshold. |

**3-tier resolution:**

```
Per-request: fetchWithCache(url, { strategy: "network-first" })
  → Route pattern: config.build.routes = [{ pattern: "/api/auth/*", strategy: "network-only" }]
    → Global default: config.strategy = "stale-while-revalidate"
```

Each tier overrides the one below. A single `fetchWithCache` call with `strategy: "network-only"` bypasses both route patterns and global defaults.

**Key properties:**

- **Thread:** Service Worker. Strategy logic runs in the `fetch` event handler, before the response reaches the main thread.
- **Storage:** Cache Storage API (disk-backed). Every strategy reads and writes to the SW cache.
- **StaleTime integration:** `reactive` strategy uses `staleTime` to determine freshness. `cache-first` and `stale-while-revalidate` always serve cache regardless of age.
- **No framework coupling:** Strategies apply to every `fetch` event intercepted by the SW, not just `fetchWithCache` calls. Plain `fetch()` calls on the page also go through the configured strategy.

## How competitors handle it

**TanStack Query / SWR:**
One strategy — stale-while-revalidate (with configurable `staleTime` and `gcTime`). There is no cache-first, network-first, cache-only, or network-only because these libraries operate at the application layer, not the SW layer. They cannot intercept native `fetch` events.

```tsx
// TanStack Query: staleTime is the closest equivalent to a strategy
const { data } = useQuery({
  queryKey: ["notes"],
  queryFn: () => fetch("/api/notes").then(r => r.json()),
  staleTime: 30_000, // within 30s, serve cache and don't refetch
  gcTime: 300_000,   // keep in cache 5 min after unmount
});
```

**Workbox:**
5 strategies (same as Swoff minus `reactive`), also SW-level. Workbox strategies run in the SW `fetch` handler and use the Cache Storage API. However, Workbox lacks:
- 3-tier config resolution (per-request → route pattern → global).
- Per-request strategy override via headers.
- `reactive` strategy (staleTime-based freshness).

```js
// Workbox: route-level strategy configuration
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/notes"),
  new StaleWhileRevalidate({ cacheName: "notes-cache" })
);
```

**Apollo Client:**
No explicit caching strategies. Apollo's `InMemoryCache` is a normalized GraphQL cache that merges incoming data with existing cache. The fetch policy (`cache-first`, `network-only`, `cache-and-network`, `network-only`, etc.) determines whether a query reads cache first. This is app-level, not SW-level — the fetch policy does not affect native `fetch` caching or offline behavior.

## Comparison table

| Aspect | Swoff | Workbox | TanStack Query | Apollo Client |
|---|---|---|---|---|
| **Execution layer** | SW `fetch` event | SW `fetch` event | Main thread JS | Main thread JS |
| **Strategies** | 6 (cache-first, network-first, SWR, cache-only, network-only, reactive) | 5 (no reactive) | 1 (SWR via staleTime) | 4 (cache-first, network-only, cache-and-network, network-only — no SW-level) |
| **3-tier resolution** | ✅ Per-request → route pattern → global | 🟡 2-tier (route → global) | ❌ Per-query only | ❌ Per-query only |
| **Per-request override** | ✅ Via `strategy` option in `fetchWithCache` | ❌ Route-level only | ❌ Per-query only | ❌ Per-query only |
| **Route pattern matching** | ✅ Glob patterns in config | ✅ Regex/string matchers | ❌ Not supported | ❌ Not supported |
| **Offline fallback** | ✅ All strategies degrade to cache | ✅ All strategies degrade to cache | ❌ On error, no fallback | ❌ On error, no fallback |
| **Cache persistence** | Cache Storage API (disk) | Cache Storage API (disk) | In-memory (wiped on reload) | In-memory + optional IDB persistence |
| **StaleTime integration** | ✅ Built-in (`reactive` strategy) | ❌ No staleTime concept | ✅ staleTime controls refetch | ✅ fetchPolicy controls behavior |
| **Bundle cost** | 0 kB (generated code) | ~30 kB SW runtime module | ~20 kB | ~32 kB |
| **Native fetch interception** | ✅ Every `fetch()` on the page | ✅ Every `fetch()` on the page | ❌ Only through `queryFn` | ❌ Only through Apollo Client |

## What 3-tier resolution means in practice

With TanStack Query, every `useQuery` call specifies its own `staleTime`. To apply a consistent policy across all queries of a certain type, the developer either:
- Copies the same `staleTime` to every `useQuery` call (duplication, drift risk).
- Creates a custom `useQuery` wrapper (additional abstraction layer).

With Swoff, the developer sets strategies at three levels:

```jsonc
// 1. Global default (lowest priority)
{ "strategy": "stale-while-revalidate" }

// 2. Route pattern overrides
"build": {
  "routes": [
    { "pattern": "/api/auth/*", "strategy": "network-only" },
    { "pattern": "/api/config", "strategy": "cache-first", "staleTime": 3600000 },
    { "pattern": "/api/search*", "strategy": "network-first" },
  ]
}

// 3. Per-request override (highest priority — inline in code)
fetchWithCache("/api/live-data", { strategy: "network-only" })
```

This means the auth team can enforce `network-only` for `/api/auth/*`, the config team sets hourly cache for `/api/config`, and the search team uses `network-first` with offline fallback — all without touching each other's code. The single per-request override lets any component bypass the pattern for exceptional cases.

## When Swoff's approach matters most

1. **Mixed data profiles** — A dashboard with user profile (stale-while-revalidate), live notifications (reactive with 10s staleTime), and auth checks (network-only) — all `fetchWithCache` calls, all co-existing with different strategies.
2. **Offline-first** — Every strategy degrades gracefully. `network-first` falls back to cache. `cache-only` never leaves cache. Even `network-only` returns the cached response if the SW can't reach the server.
3. **Third-party resources** — Strategies apply to every `fetch` event, not just `fetchWithCache`. A third-party analytics script using plain `fetch()` is also subject to the SW strategy.
