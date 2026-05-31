# Offline-First Infrastructure: Library Comparison

## Libraries Compared

| Library             | Category                  | Approach                           | Runtime size                             |
| ------------------- | ------------------------- | ---------------------------------- | ---------------------------------------- |
| **Swoff**           | All-in-one generator      | Config-driven code gen             | 0 kB                                     |
| **Workbox**         | SW toolkit                | Build-time + runtime modules       | ~30 kB                                   |
| **vite-plugin-pwa** | SW (Vite)                 | Vite plugin wrapping Workbox       | ~30 kB                                   |
| **TanStack Query**  | Server state              | Runtime JS                         | 3.8 kB gzip                              |
| **SWR**             | Server state              | Runtime JS                         | 3.3 kB gzip                              |
| **RTK Query**       | Server state              | Runtime JS + Redux                 | 2.9 kB + Redux                           |
| **Apollo Client**   | GraphQL client            | Runtime JS                         | ~32 kB gzip                              |
| **RxDB**            | Offline-first DB          | Runtime JS                         | ~40 kB gzip                              |
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
| Zero runtime dependencies         | ✅ generated code   | ❌ Workbox         | ❌ 3.8 kB      | ❌ 32 kB         | ❌ 40 kB       | ❌ + Query + DB         |
| Config-driven setup               | ✅ single file      | ✅ workbox-config  | ❌ code-only   | ❌ code-only     | ❌ code-only   | ❌ code-only            |
| Build-tool agnostic               | ✅ any              | ✅ any             | ✅ any         | ✅ any           | ✅ any         | ✅ any                  |
| React hooks                       | ✅ 11               | 🟡 minimal         | ✅ extensive   | ✅               | ✅             | ✅ useLiveQuery         |
| TypeScript declarations generated | ✅                  | ❌                 | ✅ built-in    | ✅ built-in      | ✅ built-in    | ✅ built-in             |
| Auditable generated code          | ✅ every file       | 🟡 only SW        | ❌             | ❌               | ❌             | ❌                      |

## Edge Case Handling

| Edge Case                         | Swoff                                    | TanStack Query / SWR | Workbox                     |
| --------------------------------- | ---------------------------------------- | -------------------- | --------------------------- |
| **Concurrent invalidation + SWR refresh** | Tagless refresh never clobbers invalidation entry in queue | N/A (no SW) | No tag system |
| **SW update during offline write** | Cache API + Tag IDB survive SW restart; refresh queue recreated on next fetch | N/A | Cached assets survive; runtime cache cleared if configured |
| **Tab crash mid-mutation replay** | SW detects no clients → replays via Background Sync | N/A (no SW) | No mutation system |
| **Rapid repeated invalidations** | Debounced INVALIDATE_TAG coalescing (configurable) | N/A | No tag system |
| **Offline mid-batch mutation replay** | Per-mutation online check stops processing; remaining mutations stay queued | N/A | No mutation system |
| **Query param cache-busting** | Configurable ignore params + sorted normalization | N/A | No SW-level caching |
| **Network flicker on reconnect** | Batch delay + retry backoff prevent stampede | ❌ no SW batching | ❌ per-request only |
| **staleVersions memory limit** | Max 100 entries, 30 min TTL; lost entries just skip stale fallback | N/A | N/A |
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
- **SW confirmation-driven events** — `cache-invalidated` fires only after SW confirms via `TAG_INVALIDATED`, not before SW clears cache. Eliminates the "event before action" race.
- **Tag registry repopulation on refresh** — after invalidation deletes tag→URL mappings from IDB, the background refresh re-populates them. Subsequent invalidations still find the URL.
- **SW-broadcast cross-tab invalidation** — `TAG_INVALIDATED` is posted to every connected client via `self.clients.matchAll()`. No BroadcastChannel needed.

**Where TanStack DB leads (and Swoff still needs to catch up):**

- **Optimistic updates** — instant local writes with automatic rollback on failure.
- **Normalized collections** — query across related data with joins, filters, and aggregates.
- **Differential dataflow** — sub-millisecond incremental query re-computation even with 100k+ items.
- **SSR support** — works with server rendering (TanStack DB is actively developing this).

**Where Swoff still leads vs TanStack DB:**

- **SW-level caching** — Swoff intercepts at the `fetch` event, caching even third-party and plain `fetch()` calls. TanStack DB operates at the application layer only.
- **Auth across the stack** — token injection, 401 handling, refresh in SW + client.
- **Zero runtime deps** — generated code vs TanStack DB's ~6 kB core + Query + optional SQLite WASM.
- **Config-driven setup** — one config file vs code-only setup.
- **PWA + push notifications** — built into the generated output.

**Where Swoff still needs to catch up:**

- **Framework hooks** — React only. Vue, Svelte, Solid adapters planned.
- **Infinite queries / pagination** — not yet built.
- **Optimistic updates** — not yet built.
- **Normalized GraphQL cache** — body-hash caching is simple but cannot merge overlapping query results like Apollo/Relay.
- **Devtools** — no browser extension yet.

## Architecture fit

Swoff operates at the **browser infrastructure layer** (Service Worker + `fetch` event), not the application layer. This means it works with any backend (PHP, Laravel, Django, Rails, Go, Java), any frontend (React, Vue, Svelte, HTMX, vanilla), and any rendering strategy (SSR, SSG, SPA, islands, HTML-over-wire). See [ECOSYSTEM.md](./ECOSYSTEM.md).
