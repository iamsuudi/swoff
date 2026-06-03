# Offline-First Infrastructure: Library Comparison

## Libraries Compared

| Library             | Category                  | Approach                           | Runtime size                             |
| ------------------- | ------------------------- | ---------------------------------- | ---------------------------------------- |
| **Swoff**           | Offline infra generator   | Config-driven code gen             | 0 kB                                     |
| **Workbox**         | SW toolkit                | Build-time + runtime modules       | ~30 kB                                   |
| **vite-plugin-pwa** | SW (Vite)                 | Vite plugin wrapping Workbox       | ~30 kB                                   |
| **TanStack Query**  | Server state              | Runtime JS                         | 3.8 kB gzip                              |
| **SWR**             | Server state              | Runtime JS                         | 3.3 kB gzip                              |
| **RTK Query**       | Server state              | Runtime JS + Redux                 | 2.9 kB + Redux                           |
| **Apollo Client**   | GraphQL client            | Runtime JS                         | ~32 kB gzip                              |
| **RxDB**            | Client DB                 | Runtime JS                         | ~40 kB gzip                              |
| **ElectricSQL**     | Client DB (sync engine)   | Runtime + PGlite WASM             | ~3 MB gzip                               |
| **PowerSync**       | Client DB (sync engine)   | Runtime + SQLite                   | ~2 MB gzip                               |
| **TanStack DB**     | Client DB + offline-first | Runtime JS (differential dataflow) | ~6 kB gzip core (+ SQLite WASM optional) |

## Feature Matrix

### Caching & Strategies

| Feature                           | Swoff               | Workbox            | TanStack Query | Apollo           | RxDB           | TanStack DB             |
| --------------------------------- | ------------------- | ------------------ | -------------- | ---------------- | -------------- | ----------------------- |
| SW code generation                | ✅ Full source      | 🟡 Partial runtime | ❌             | ❌               | ❌             | ❌                      |
| Caching strategies                | ✅ 6                | ✅ 5               | ❌             | ❌               | ❌             | 🟡 via Query            |
| Stale-while-revalidate            | ✅                  | ✅                 | ✅             | ✅               | ❌             | ✅ via Query            |
| Cache-first / Network-first       | ✅ both             | ✅ both            | ❌             | ❌               | ❌             | ❌                      |
| Reactive strategy (staleTime)     | ✅                  | ❌                 | ✅             | ❌               | ❌             | ✅ via Query            |
| Configurable mode (all/explicit)  | ✅                  | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Cache key normalization           | ✅                  | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Ignore query params in cache key  | ✅                  | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Request batching (coalescing)     | ✅ 50 ms window     | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Precaching at install time        | ✅                  | ✅                 | ❌             | ❌               | ❌             | ❌                      |

### Invalidation

| Feature                           | Swoff               | Workbox            | TanStack Query | Apollo           | RxDB           | TanStack DB             |
| --------------------------------- | ------------------- | ------------------ | -------------- | ---------------- | -------------- | ----------------------- |
| Tag-based invalidation            | ✅ URL/op-name      | ❌                 | ✅ query-key   | 🟡 custom        | ❌             | ❌ query-key only       |
| Cascading tag dependencies        | ✅ client-expanded  | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Glob-pattern invalidation         | ✅                  | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Tag introspection (urls→tags, tags→urls) | ✅          | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Server push invalidation (SSE/WS) | ✅ built-in         | ❌                 | ❌             | ✅ subscriptions | ✅ replication | 🟡 via sync engine      |
| SW confirmation before event      | ✅                  | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| De-duplicated refresh queue       | ✅ batch + Map      | ❌                 | ❌             | ❌               | ❌             | ❌                      |

### Offline & Background Sync

| Feature                           | Swoff               | Workbox            | TanStack Query | Apollo           | RxDB           | TanStack DB             |
| --------------------------------- | ------------------- | ------------------ | -------------- | ---------------- | -------------- | ----------------------- |
| Offline write queue               | ✅ IndexedDB        | 🟡 basic           | ❌             | ❌               | ✅             | ✅ optimistic + offline |
| Configurable retry+backoff        | ✅                  | 🟡                 | ❌             | ❌               | ❌             | 🟡 via Query            |
| Background sync (post-tab-close)  | ✅ SW via sync API  | ✅ plugin          | ❌             | ❌               | ❌             | ✅ offline tx           |
| Per-mutation online check         | ✅ before each      | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Manual flush (after re-login)     | ✅                  | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Mutation progress tracking        | ✅ per-item + batch | ❌                 | ❌             | ❌               | ❌             | 🟡 per-item            |

### Service Worker

| Feature                           | Swoff               | Workbox            | TanStack Query | Apollo           | RxDB           | TanStack DB             |
| --------------------------------- | ------------------- | ------------------ | -------------- | ---------------- | -------------- | ----------------------- |
| Generated auditable SW code       | ✅ full source      | 🟡 loader module   | ❌             | ❌               | ❌             | ❌                      |
| 3-tier config resolution          | ✅ per-request → pattern → global | 🟡 2-tier | ❌     | ❌               | ❌             | ❌                      |
| SW update versioning              | ✅ 3 modes          | ✅ runtime         | ❌             | ❌               | ❌             | ❌                      |
| Navigation preload                | ✅                  | ✅                 | ❌             | ❌               | ❌             | ❌                      |
| SPA fallback for navigation       | ✅                  | ✅                 | ❌             | ❌               | ❌             | ❌                      |
| SW lifecycle coordination         | ✅ client-injector  | ✅ built-in        | ❌             | ❌               | ❌             | ❌                      |

### Auth

| Feature                           | Swoff               | Workbox            | TanStack Query | Apollo           | RxDB           | TanStack DB             |
| --------------------------------- | ------------------- | ------------------ | -------------- | ---------------- | -------------- | ----------------------- |
| Built-in auth header injection    | ✅ 3 types          | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Auth-aware offline queue          | ✅                  | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Token refresh before expiry       | ✅                  | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| 401 detection → clear auth        | ✅ SW + client      | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Memory-only token storage         | ✅                  | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Offline user data cache           | ✅ IndexedDB        | ❌                 | ❌             | ❌               | ❌             | ✅                     |

### GraphQL

| Feature                           | Swoff               | Workbox            | TanStack Query | Apollo           | RxDB           | TanStack DB             |
| --------------------------------- | ------------------- | ------------------ | -------------- | ---------------- | -------------- | ----------------------- |
| Body-hash GQL caching             | ✅ SHA-256          | ❌                 | ❌             | ✅ in-memory     | ❌             | 🟡 normalized cols      |
| GQL operation-name auto-tags      | ✅                  | ❌                 | ❌             | 🟡 custom        | ❌             | ❌                      |
| GQL offline mutation queue        | ✅                  | ❌                 | ❌             | ❌               | ❌             | ✅                     |

### Real-time & PWA

| Feature                           | Swoff               | Workbox            | TanStack Query | Apollo           | RxDB           | TanStack DB             |
| --------------------------------- | ------------------- | ------------------ | -------------- | ---------------- | -------------- | ----------------------- |
| SSE/WS connection management      | ✅ built-in         | ❌                 | ❌             | 🟡 link          | ✅ replication | 🟡 via sync engine      |
| PWA install prompt                | ✅                  | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Push notifications                | ✅ + React hook     | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Manifest generation               | ✅                  | 🟡                  | ❌             | ❌               | ❌             | ❌                      |

### Cross-tab & State

| Feature                           | Swoff               | Workbox            | TanStack Query | Apollo           | RxDB           | TanStack DB             |
| --------------------------------- | ------------------- | ------------------ | -------------- | ---------------- | -------------- | ----------------------- |
| Cross-tab invalidation sync       | ✅ SW-broadcast     | ❌                 | 🟡 limited     | ❌               | ❌             | 🟡 LocalStorage         |
| Tag registry (IndexedDB)          | ✅ persistent       | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Cache persistence model           | Cache API + IDB     | Cache API          | In-memory      | In-memory + IDB  | IDB            | IDB + SQLite            |
| State survives page refresh       | ✅ Cache API + IDB  | ✅ Cache API       | ❌             | 🟡 persisted     | ✅             | ✅                      |

### Developer Experience

| Feature                           | Swoff               | Workbox            | TanStack Query | Apollo           | RxDB           | TanStack DB             |
| --------------------------------- | ------------------- | ------------------ | -------------- | ---------------- | -------------- | ----------------------- |
| Zero runtime dependencies         | ✅ generated code   | ❌ Workbox         | ❌ 3.8 kB      | ❌ 32 kB         | ❌ 40 kB       | ❌ + Query + DB + SQLite WASM |
| Config-driven setup               | ✅ single file      | ✅ workbox-config  | ❌ code-only   | ❌ code-only     | ❌ code-only   | ❌ code-only + schema defs |
| Build-tool agnostic               | ✅ any              | ✅ any             | ✅ any         | ✅ any           | ✅ any         | ✅ any                  |
| React hooks                       | ✅ 10               | 🟡 minimal         | ✅ extensive   | ✅               | ✅             | ✅ useLiveQuery         |
| TypeScript declarations generated | ✅                  | ❌                 | ✅ built-in    | ✅ built-in      | ✅ built-in    | ✅ built-in             |
| Auditable generated code          | ✅ every file       | 🟡 only SW        | ❌             | ❌               | ❌             | ❌                      |
| Lines of setup code               | ✅ 0 (1 config)     | 🟡 config + imports| ❌ query client + hooks setup | ❌ ApolloClient + link chain | ❌ schema + RxDB creation | ❌ schema + DB + sync engine + server adapter |
| Dual database management          | ✅ none (native Cache API) | ✅ none      | ❌ not offline | ❌ not offline   | 🟡 client-only | ❌ client SQLite + server DB like a distributed system |

## Edge Case Handling

| Edge Case                         | Swoff                                    | TanStack Query / SWR | TanStack DB / Workbox        |
| --------------------------------- | ---------------------------------------- | -------------------- | ---------------------------- |
| **Concurrent identical GET requests** | 50 ms batch window coalesces all into one fetch; in-flight dedup catches late arrivals | ❌ multiple requests | ❌ per-request only |
| **Concurrent invalidation + SWR refresh** | Tagless refresh never clobbers invalidation entry in queue | N/A (no SW) | No tag system |
| **SW update during offline write** | Cache API + Tag IDB survive SW restart; refresh queue recreated on next fetch | N/A | Cached assets survive; runtime cache cleared if configured |
| **Tab crash mid-mutation replay** | SW detects no clients → replays via Background Sync | N/A (no SW) | No mutation system |
| **Rapid repeated invalidations** | Debounced INVALIDATE_TAG coalescing (configurable) | N/A | No tag system |
| **Offline mid-batch mutation replay** | Per-mutation online check stops processing; remaining mutations stay queued | N/A | No mutation system |
| **Query param cache-busting** | Configurable ignore params + sorted normalization | N/A | No SW-level caching |
| **Network flicker on reconnect** | Batch delay + retry backoff prevent stampede | ❌ no SW batching | ❌ per-request only |
| **staleVersions memory limit** | Max 100 entries, 30 min TTL; lost entries just skip stale fallback | N/A | N/A |
| **Data persists after logout** | `clearAuth()` wipes tokens + user cache; mutation queue cleared; session is clean slate | N/A (no auth) | ❌ TanStack DB: SQLite retains all data — developer must manually purge on logout or stale user data persists |
| **Tag IDB deleted mid-refresh** | Refresh re-populates tag IDB from queue entry's stored tags | N/A | N/A |
| **Dual-replay client + SW race** | SW checks clients.open() → skips entirely if any client page is open | N/A | No mutation system |
| **Background sync after all tabs close** | SW wakes via sync event, processes queue, IndexedDB persists | N/A | N/A |
| **Fetch error during stale refetch** | Exponential backoff retry via setTimeout keeps SW alive | Retry via hook | ❌ |
| **No service worker support** | SW-all features degrade gracefully; mutation queue falls back to client-only IDB | N/A (normal) | N/A (no SW = nothing) |

### How each library handles persistence model failure

| Failure Scenario                  | Swoff                                    | TanStack Query       | RxDB                  | TanStack DB           |
| --------------------------------- | ---------------------------------------- | -------------------- | --------------------- | --------------------- |
| Memory cleared (tab close/refresh) | ✅ Tag IDB + Cache API survive | ❌ Full loss | ✅ IDB survives | ✅ IDB survives |
| SW terminated (idle)              | ✅ IDB + Cache API survive; Maps rebuilt on next wake | N/A | N/A | N/A |
| SW killed during fetch handler    | ✅ Cache API atomic; partial writes discarded | N/A | N/A | N/A |
| IndexedDB quota exceeded          | ✅ Cache API still functional; only tag introspection lost | N/A | ❌ Full loss | ❌ Full loss |
| Browser storage cleared           | ✅ All caches lost, SW stays installed; next generation re-caches | ❌ | ❌ | ❌ |

### How Swoff handles race conditions

| Race Condition                    | Mitigation                               |
| --------------------------------- | ---------------------------------------- |
| SWR queues refresh without tags → invalidation queues with tags | `queueRefresh` guard: tagless call doesn't override if entry with tags exists |
| Refresh completes after invalidation deletes tag IDB | `_processRefreshQueue` re-populates tags from queue entry |
| Client triggers `invalidateByTag` before SW caches response | SW processes `INVALIDATE_TAG` at message time; if cache entry doesn't exist yet, it's a no-op for that URL |
| Multiple tabs call `invalidateByTag` simultaneously | SW debounce (configurable) + Map dedup on tag; single IDB scan |
| SW and client both try to replay mutation queue | SW skips entirely if any client page is open |
| Refresh fails → staleVersions entry → next SWR serves stale | staleVersions TTL 30 min, max 100 entries; serves old cache as fallback until retry succeeds |

## Key Differentiators

**Where Swoff leads:**

- **Offline-first integration** — combines SW caching, data fetching, auth, mutation queue, GraphQL, PWA, push notifications, cross-tab sync, and real-time invalidation in a single config-driven system. Others require 4-6 separate tools.
- **Zero runtime dependencies** — generated code uses only browser APIs. No bundle impact, no version mismatches.
- **Auth across the stack** — token injection, 401 handling, refresh, offline user caching, and state detection built into fetch wrapper, mutation queue, and SW.
- **Generated auditable code** — every line visible in `swoff/`. Read, edit, and commit it.
- **Config-driven resolution** — 3-tier priority for strategy (per-request → route pattern → global default).
- **Request batching** — concurrent GETs to the same URL within a 50 ms window coalesce into one network request. No other offline-first toolkit batches at the fetch level.
- **SW confirmation-driven events** — `cache-invalidated` fires only after SW confirms via `TAG_INVALIDATED`, not before SW clears cache. Eliminates the "event before action" race.
- **Tag registry repopulation on refresh** — after invalidation deletes tag→URL mappings from IDB, the background refresh re-populates them. Subsequent invalidations still find the URL.
- **SW-broadcast cross-tab invalidation** — `TAG_INVALIDATED` is posted to every connected client via `self.clients.matchAll()`. No BroadcastChannel needed.
- **SSR-safe generated code** — all generated modules guard browser globals; `fetchWithCache` and hooks work in Node.js server rendering without crashing or stubbing.

**Client databases (RxDB, TanStack DB, ElectricSQL, PowerSync) — a different paradigm:**

These libraries embed a client-side database (IndexedDB, SQLite via WASM, PGlite) and synchronize it with the server. They excel at:
- **Normalized collections** — SQL joins, filters, aggregation, full-text search on the client.
- **Optimistic updates with phantom ID reconciliation** — schema-aware ID mapping.
- **Incremental sync** — only changed rows replicate, not entire HTTP responses.
- **Conflict resolution** — last-write-wins, CRDTs, or custom merge strategies.

Ideal for collaborative editors, inventory systems, or any app whose primary model *is* the database. But this comes with architectural costs:
- **Dual database management** — every schema change must be migrated in both server DB and client DB, with persistent schema-drift risk.
- **WASM download** — SQLite via WASM adds ~800 kB decompressed, multi-second parse time, and a separate memory heap (CSP concerns).
- **Sync engine complexity** — replication protocol, change tracking, conflict resolution.
- **No SW-layer caching** — native `fetch` cache is bypassed; third-party requests, plain `fetch()` calls, and CDN assets have no cache layer.
- **Auth integration is manual** — no built-in token injection, 401 handling, or offline auth state.
- **Runtime coupling** — sync engine + client DB become permanent runtime dependencies that must be loaded on every page visit.

Swoff takes the opposite approach: operate at the SW layer using the native Cache Storage API. No schemas, no sync engine, no WASM, no dual databases, no phantom ID reconciliation. Data is cached by URL, served stale-while-revalidate, invalidated by tag, and refreshed by the SW. This is strictly less expressive than a client DB (no joins, no aggregation) but covers the 90% use case — reliable offline READ of server data — with zero runtime deps, zero WASM, and zero schema coupling.

**Where Swoff still leads vs client databases:**
- **Native `fetch` interception** — works with any request, any library, any third-party resource. Client databases only see data routed through their sync engine.
- **No dual database management** — no schemas, no sync engine, no WASM downloads. Cache Storage API is built into every browser.
- **Auth across the stack** — token injection, 401 handling, refresh in SW + client. Client databases provide no auth layer.
- **Privacy-safe logout** — `clearAuth()` wipes tokens + user cache from memory and IDB. Client databases persist all data indefinitely — developer must manually purge.
- **Zero runtime deps** — generated code uses only browser APIs. Client databases ship sync engine + query layer + storage engine as mandatory runtime deps.
- **Config-driven setup** — one config file vs schema definitions + sync configuration + DB initialization.
- **PWA + push notifications** — built into the generated output.
- **No WASM** — no multi-second parse time, no separate memory heap, no CSP concerns.
- **Cross-tab sync** — SW-broadcast invalidation syncs cache across tabs without BroadcastChannel.
- **State survives SW restart** — IDB + Cache API persist across SW lifecycle. Client DB WASM must re-initialize on every page load.

**Where Swoff still needs to catch up:**
- **Framework hooks** — React only (10 hooks). Vue, Svelte, Solid adapters planned.
- **Normalized GraphQL cache** — body-hash caching cannot merge overlapping query results like Apollo/Relay.
- **Devtools** — no browser extension yet.

## Design Decisions

Swoff operates at the **browser infrastructure layer** (Service Worker + `fetch` event), not the application layer. This boundary shapes several deliberate exclusions.

### Optimistic updates (intentionally excluded)

Optimistic updates (instant local writes with rollback on failure) are an application-layer concern. Swoff does not implement them for the following reasons:

**1. Phantom ID problem during offline mutation window.**  
A note is created offline via the mutation queue. The app shows it optimistically with a temporary client-side ID. The user edits this note — that edit is also queued as a mutation referencing the temporary ID. When the queue replays, the create mutation reaches the server, gets a real ID, but the edit mutation still references the old temporary ID. The server rejects it or applies it to the wrong resource. Resolving this requires either:
- A client-side ID mapping layer that translates temp → real IDs across dependent mutations.
- A schema-aware system that knows which fields are IDs and needs to rewrite mutation bodies.

Both approaches couple Swoff to the application's data model — a boundary Swoff deliberately does not cross.

**2. Complex data relationships.**  
Real-world UIs display the same underlying data through multiple derived views (aggregations, filtered lists, computed totals, cross-references). An optimistic update must revert all of these consistently on failure. Libraries like TanStack Query solve this by coupling query keys to a normalized cache — every query key maps to the same underlying entity, so a rollback updates all derived queries atomically. This requires a schema-aware normalized store that Swoff's infrastructure layer does not (and should not) provide.

**3. Telegram-style offline pattern (pending state over optimistic UI).**  

The most successful offline-first consumer app — Telegram — does not use optimistic updates for edits. When you send a message offline, it appears as pending (with a clock icon). You cannot edit or interact with that message until it is synced with the server. This constraint exists for the same reason Swoff avoids optimistic UI: phantom IDs. A pending message has no server-assigned ID, so any dependent action (edit, reply, delete) cannot reference it reliably.

Swoff's mutation queue follows this same pattern:
```
mutation → queued in IDB (pending state)
         → mutation shows as pending in UI
         → SW replays when online
         → SW invalidates cache → refetches
         → useCachedFetch receives fresh data → re-renders
         → pending state replaced by confirmed server state
```

This is simpler, more robust, and avoids phantom ID reconciliation entirely. If the developer wants transient optimistic UI on top (e.g., showing the text immediately while marking it pending), that's an application-layer concern using standard React state — Swoff handles the infrastructure, the app handles UX.

**4. Separation of concerns.**  
Swoff's role is to cache, serve, invalidate, and refetch data reliably. When fresh data arrives (via SW refetch, invalidation, or server push), the application layer re-renders. The SW handles data freshness; the app handles UI optimism. This boundary is clean, composable, and doesn't require Swoff to understand the shape or relationships of the application's data.

### Infinite queries / pagination (intentionally excluded as a built-in feature)

**Why not a `useInfiniteQuery` hook?**

Pagination APIs vary wildly in their interface:
- **Cursor-based:** `{ cursor, data, nextCursor }`
- **Offset-based:** `{ offset, limit, total, data }`
- **Page-based:** `{ page, totalPages, items }`
- **Keyset-based:** `{ data, lastSeenId }`
- **Custom:** any combination of the above

Swoff cannot generate a generic pagination hook because it has no schema information about the API response shape. A generated hook would either:
- Be so generic it adds no value over `useCachedFetch(nextPageUrl)`.
- Require the developer to manually specify field mappings (`getNextPageParam`, `totalPagesField`, etc.) — at which point a purpose-built library like TanStack Query's `useInfiniteQuery` is a better fit.

**What Swoff already provides:**

Swoff caches every URL independently in the Cache Storage API. For pagination, the developer simply constructs the page URL and calls `useCachedFetch`:

```tsx
const { data } = useCachedFetch(`/api/items?page=${page}`);
// SW caches each page URL separately
// Navigating back to page 1 loads instantly from cache
// Next-page prefetching is a one-liner:
const { refetch } = useCachedFetch(`/api/items?page=${page + 1}`, { enabled: false });
// Call refetch() when the user scrolls near the bottom
```

Each page URL is cached independently by the SW. Request batching coalesces simultaneous page fetches. Navigation between pages is instant from cache. The developer retains full control over pagination UX while the SW handles caching, offline serving, and stale-while-revalidate — which covers the 90% case without schema coupling.

## Architecture fit

Swoff operates at the **browser infrastructure layer** (Service Worker + `fetch` event), not the application layer. This means it works with any backend (PHP, Laravel, Django, Rails, Go, Java), any frontend (React, Vue, Svelte, HTMX, vanilla), and any rendering strategy (SSR, SSG, SPA, islands, HTML-over-wire). See [ECOSYSTEM.md](./ECOSYSTEM.md).
