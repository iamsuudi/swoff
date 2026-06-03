# Data Layer: HTTP Caching vs Client Databases

The way you cache data on the client determines your entire offline architecture. Swoff operates at the HTTP cache layer — the Service Worker intercepts `fetch` events, caches responses by URL, and serves them on subsequent requests. Data retains its server shape (JSON, HTML, images) and the server remains the single source of truth. Client databases (RxDB, TanStack DB, ElectricSQL, PowerSync) embed a local database engine and synchronize it with the server — they solve a fundamentally different problem, and the choice between them defines your relationship with data, consistency, and complexity.

## How Swoff does it

Swoff implements 6 caching strategies that execute in the SW `fetch` event handler, configured through a 3-tier resolution system:

**The 6 strategies:**

| Strategy                 | Behavior                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cache-first`            | Return cached response immediately. Fetch network in background to update cache. Never show stale data for longer than the last successful fetch. |
| `network-first`          | Try network. On failure, serve cache. Best for live data with offline fallback.                                                                   |
| `stale-while-revalidate` | Serve cached (even if stale), then fetch network in background. Best for data that doesn't change infrequently.                                   |
| `cache-only`             | Serve only from cache. No network fetch. Useful for precached assets.                                                                             |
| `network-only`           | Always fetch from network. Never cache. Best for non-cacheable data (auth, nonces).                                                               |
| `reactive`               | Serve cache if within `staleTime`, otherwise fetch network + cache. Combines `cache-first` with a freshness threshold.                            |

**3-tier resolution:**

```
Per-request: fetchWithCache(url, { strategy: "network-first" })
  → Route pattern: config.strategy.patterns["/api/auth/*"] = "network-only"
    → Global default: config.strategy.default = "stale-while-revalidate"
```

Each tier overrides the one below. A single `fetchWithCache` call with `strategy: "network-only"` bypasses both route patterns and global defaults.

**Server is source of truth:** Swoff caches HTTP responses as-is. When data changes, the server sends invalidation signals via SSE/WebSocket, the SW evicts stale entries, and the next request fetches fresh data. No polling, no sync engine, no conflict resolution.

**No schemas, no migrations:** The server defines the API response shape. A new field in the response is automatically cached without any client-side schema change — there is no schema.

## How competitors handle it

**TanStack Query / SWR:** One strategy — stale-while-revalidate (with configurable `staleTime` and `gcTime`). No cache-first, network-first, cache-only, or network-only because these libraries operate at the application layer, not the SW layer. They cannot intercept native `fetch` events or cache HTML/CSS/JS for offline navigation.

**Workbox:** 5 strategies (same as Swoff minus `reactive`), also SW-level, using Cache Storage API. Lacks 3-tier resolution, per-request override via headers, and reactive strategy (staleTime-based freshness).

**Apollo Client:** No explicit caching strategies. `InMemoryCache` is a normalized GraphQL cache with fetch policies (`cache-first`, `network-only`, `cache-and-network`). App-level only — does not affect native `fetch` caching or offline HTML access.

**Client DBs (RxDB, TanStack DB, ElectricSQL, PowerSync):** Embed a local database engine (IndexedDB, SQLite WASM, PGlite) and replicate server data through a sync engine. The app reads and writes to the local DB as if it were primary storage.

## The client DB approach and its costs

**No offline app skeleton.** Client DBs store and query data locally, but they don't make your app's HTML, CSS, or JavaScript accessible offline. Without a separate Service Worker setup, the app itself can't load when offline. You get data without an app to display it.

**Polling disguised as real-time.** The sync engine polls the server at intervals or on connectivity changes. Two users on the same network may see different versions of "synced" data. True real-time requires consistent WebSocket/SSE connections, which these libraries don't provide out of the box.

**Dual-DB maintenance tax.** Every schema migration — add a column, change a type, rename a field — must be applied to both the server database and the client database schema definition. Sync engine configuration must know which tables to replicate, which fields to include, and how to map data types. This is distributed system maintenance in your frontend codebase.

**Server becomes a data dump.** With client-side queries (filter, sort, search, aggregation), the server is reduced to a bulk data provider. Each user runs their own queries against their local copy. There is no single source of truth — every user sees their own version of the data, and no two clients are guaranteed to be in sync at any moment.

**WASM bloat.** SQLite-in-browser requires a 2–3 MB gzip download (PGlite WASM, SQL.js). On a mobile connection, that's the entire budget for your app's code, spent on a database engine most apps don't need.

**Data never auto-clears.** All user data persists in IndexedDB or SQLite indefinitely. On shared devices, one user's cached data — contacts, orders, messages — is visible to the next user. Privacy-safe logout requires manually purging the entire local database, and this is often forgotten.

**Over-engineered for most use cases.** Form-heavy apps are often cited as a reason to pull in a client database. But forms are stateful UI — store drafts in native IndexedDB or localStorage, free browser APIs that have been available for years. You don't need a schema definition, a sync engine, or a WASM download to save a few form fields. Learn to use the platform — it's powerful and already there.

Collaborative editing is another misleading sales pitch. Client DBs sync to a server, but they don't provide real-time coordination between users. True collaborative editing requires consistent WebSocket connections with CRDT or OT, not a polling sync engine. If you're building a collaborative app, you need WebSocket or WebRTC — the client DB is an unnecessary middleman that adds latency and complexity.

The same applies to inventory and catalog apps. These apps need an offline app skeleton first — the HTML, CSS, and JavaScript must be cacheable by a Service Worker. Without that, the user can't even reach the app when offline. Storing data client-side is meaningless if there's no UI to browse it.

Client DBs market themselves as a complete offline solution, but they only solve data storage. They don't handle the offline app shell, real-time communication, auth token lifecycle, cross-tab sync, push notifications, or cache invalidation. These are all separate problems you must solve independently — and each one adds another dependency.

## Comparison table

| Aspect                        | Swoff                                       | TanStack Query / SWR               | Workbox                         | Client DBs (RxDB, TanStack DB, ElectricSQL, PowerSync) |
| ----------------------------- | ------------------------------------------- | ---------------------------------- | ------------------------------- | ------------------------------------------------------ |
| **Paradigm**                  | SW HTTP cache                               | App-layer stale-while-revalidate   | SW HTTP cache                   | Client DB + sync engine                                |
| **Cache scope**               | Any HTTP response (HTML, assets, REST, GQL) | Only data passed to `queryFn`      | Any HTTP response               | Only data in synced collections                        |
| **Offline app skeleton**      | ✅ Built-in (SW caches HTML/CSS/JS)         | ❌ Not provided                    | ✅ Built-in                     | ❌ Requires separate SW                                |
| **Server as source of truth** | ✅ Yes — cache is ephemeral                 | 🟡 Stale data lives until refetch  | ✅ Yes — cache is ephemeral     | ❌ Each client has its own DB version                  |
| **Real-time mechanism**       | SSE/WebSocket server push                   | Polling on refetchInterval         | ❌ None                         | Polling-based sync                                     |
| **Cache invalidation**        | Tag-based + server push + auto on mutation  | Query-key based                    | URL-based                       | Manual or replication                                  |
| **Schema required**           | ❌ No                                       | ❌ No                              | ❌ No                           | ✅ Yes (client + server schemas)                       |
| **Dual-DB management**        | ❌ None                                     | ❌ None                            | ❌ None                         | ✅ Must keep client and server schemas in sync         |
| **Client-side queries**       | ❌ Server-shaped responses only             | ❌ In-memory cache only            | ❌ Server-shaped responses only | ✅ SQL + joins + aggregation                           |
| **WASM download**             | ❌ None                                     | ❌ None                            | ❌ None                         | ✅ 2–3 MB gzip                                         |
| **Privacy-safe logout**       | ✅ `clearAuth()` wipes all caches           | ❌ Memory persists until tab close | ❌ Cache persists               | ❌ Data survives across sessions                       |
| **Native fetch interception** | ✅ Every `fetch()` on the page              | ❌ Only through `queryFn`          | ✅ Every `fetch()` on the page  | ❌ Bypasses cache                                      |
| **Third-party API caching**   | ✅ Yes                                      | ❌ No                              | ✅ Yes                          | ❌ No                                                  |
| **Runtime deps**              | 0 kB (generated code)                       | ~3.8 kB gzip                       | ~30 kB SW runtime               | ~40 kB gzip + WASM                                     |
| **Setup cost**                | 1 config file                               | Query client + hooks setup         | Config + imports                | Schema + DB + sync engine + server adapter             |

## What makes Swoff different

Swoff occupies a genuinely unique slot in the ecosystem. It's not a client database — it doesn't define schemas, manage migrations, or sync rows. It's not a data-fetching library — you don't wrap every component with a query hook. It's not just a SW toolkit — Workbox handles caching but ignores auth, real-time, and offline state.

Swoff is an HTTP-cache-layer-as-a-platform. It lives in the Service Worker, intercepts every `fetch` event, and applies caching strategies at the infrastructure level — before your code runs. On top of that layer, it generates:

- Auth token injection with silent refresh and 401-driven logout
- SSE/WebSocket server push for real-time invalidation
- Cross-tab auth and invalidation sync via SW broadcast
- PWA manifest generation and install prompt management
- Mutation queue with retry and backoff for offline writes
- Background sync for post-tab-close mutation replay

All of this is framework-agnostic, all of it runs at the SW level, and all of it ships as zero-dependency generated code. That combination — SW-level caching fused with auth, real-time, PWA, and offline queue — doesn't exist in any other library. You would need Workbox + TanStack Query + a client DB + a WebSocket library + a PWA plugin to get the same surface area, and they still wouldn't be coordinated under a single config file.
