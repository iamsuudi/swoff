# Offline-First Infrastructure: Library Comparison

Swoff operates at the **browser infrastructure layer** — the Service Worker + `fetch` event — not the application layer. This means it works with any backend (PHP, Laravel, Django, Rails, Go, Java), any frontend (React, Vue, Svelte, HTMX, vanilla), and any rendering strategy (SSR, SSG, SPA, islands, HTML-over-wire). See [ECOSYSTEM.md](./ECOSYSTEM.md).

> **Integration guides:** See [guides/](./guides/) for step-by-step walkthroughs — start with PWA, add data fetching, auth, tag invalidation, GraphQL, offline mutations, push, and server push incrementally.

## Libraries Compared

| Library             | Category                  | Approach                           | Runtime size                             |
| ------------------- | ------------------------- | ---------------------------------- | ---------------------------------------- |
| **Swoff**           | Offline infra generator   | Config-driven code gen             | 0 kB                                     |
| **Workbox**         | SW toolkit                | Build-time + runtime modules       | ~30 kB                                   |
| **vite-plugin-pwa** | SW (Vite)                 | Vite plugin wrapping Workbox       | ~30 kB                                   |
| **Serwist**         | SW (Next.js-first)        | Build-time + runtime modules       | ~35 kB                                   |
| **next-pwa**        | SW (Next.js)              | Workbox wrapper plugin             | ~30 kB                                   |
| **TanStack Query**  | Server state              | Runtime JS                         | 3.8 kB gzip                              |
| **SWR**             | Server state              | Runtime JS                         | 3.3 kB gzip                              |
| **RTK Query**       | Server state              | Runtime JS + Redux                 | 2.9 kB + Redux                           |
| **Apollo Client**   | GraphQL client            | Runtime JS                         | ~32 kB gzip                              |
| **RxDB**            | Client DB                 | Runtime JS                         | ~40 kB gzip                              |
| **ElectricSQL**     | Client DB (sync engine)   | Runtime + PGlite WASM              | ~3 MB gzip                               |
| **PowerSync**       | Client DB (sync engine)   | Runtime + SQLite                   | ~2 MB gzip                               |
| **TanStack DB**     | Client DB + offline-first | Runtime JS (differential dataflow) | ~6 kB gzip core (+ SQLite WASM optional) |

## Feature Matrix

### Caching & Strategies

| Feature                          | Swoff                    | Workbox            | Serwist            | next-pwa           | TanStack Query | Apollo | RxDB | TanStack DB  |
| -------------------------------- | ------------------------ | ------------------ | ------------------ | ------------------ | -------------- | ------ | ---- | ------------ |
| SW code generation               | ✅ Full source           | 🟡 Partial runtime | 🟡 Partial runtime | 🟡 Partial runtime | ❌             | ❌     | ❌   | ❌           |
| Caching strategies               | ✅ 6                     | ✅ 5               | ✅ 5               | ✅ 5               | ❌             | ❌     | ❌   | 🟡 via Query |
| Stale-while-revalidate           | ✅                       | ✅                 | ✅                 | ✅                 | ✅             | ✅     | ❌   | ✅ via Query |
| Cache-first / Network-first      | ✅ both                  | ✅ both            | ✅ both            | ✅ both            | ❌             | ❌     | ❌   | ❌           |
| Reactive strategy (staleTime)    | ✅                       | ❌                 | ❌                 | ❌                 | ✅             | ❌     | ❌   | ✅ via Query |
| Navigation modes                 | ✅ 3 (spa, default, ssr) | ❌                 | ❌                 | ❌                 | ❌             | ❌     | ❌   | ❌           |
| HTML cache isolation             | ✅ Content-Type routing  | ❌                 | ❌                 | ❌                 | ❌             | ❌     | ❌   | ❌           |
| Auto-prefetch on client nav      | ✅ pushState interceptor | ❌                 | ❌                 | ❌                 | ❌             | ❌     | ❌   | ❌           |
| Cache key normalization          | ✅                       | ❌                 | ❌                 | ❌                 | ❌             | ❌     | ❌   | ❌           |
| Ignore query params in cache key | ✅                       | ❌                 | ❌                 | ❌                 | ❌             | ❌     | ❌   | ❌           |
| Request batching (coalescing)    | ✅ 50 ms window          | ❌                 | ❌                 | ❌                 | ❌             | ❌     | ❌   | ❌           |
| Precaching at install time       | ✅                       | ✅                 | ✅                 | ✅                 | ❌             | ❌     | ❌   | ❌           |

### Invalidation

| Feature                                  | Swoff              | Workbox | TanStack Query | Apollo           | RxDB           | TanStack DB        |
| ---------------------------------------- | ------------------ | ------- | -------------- | ---------------- | -------------- | ------------------ |
| Tag-based invalidation                   | ✅ URL/op-name     | ❌      | ✅ query-key   | 🟡 custom        | ❌             | ❌ query-key only  |
| Cascading tag dependencies               | ✅ client-expanded | ❌      | ❌             | ❌               | ❌             | ❌                 |
| Glob-pattern invalidation                | ✅                 | ❌      | ❌             | ❌               | ❌             | ❌                 |
| Tag introspection (urls→tags, tags→urls) | ✅                 | ❌      | ❌             | ❌               | ❌             | ❌                 |
| Server push invalidation (SSE/WS)        | ✅ built-in        | ❌      | ❌             | ✅ subscriptions | ✅ replication | 🟡 via sync engine |
| SW confirmation before event             | ✅                 | ❌      | ❌             | ❌               | ❌             | ❌                 |
| De-duplicated refresh queue              | ✅ batch + Map     | ❌      | ❌             | ❌               | ❌             | ❌                 |

### Offline & Background Sync

| Feature                          | Swoff               | Workbox   | TanStack Query | Apollo | RxDB | TanStack DB             |
| -------------------------------- | ------------------- | --------- | -------------- | ------ | ---- | ----------------------- |
| Offline write queue              | ✅ IndexedDB        | 🟡 basic  | ❌             | ❌     | ✅   | ✅ optimistic + offline |
| Configurable retry+backoff       | ✅                  | 🟡        | ❌             | ❌     | ❌   | 🟡 via Query            |
| Background sync (post-tab-close) | ✅ SW via sync API  | ✅ plugin | ❌             | ❌     | ❌   | ✅ offline tx           |
| Per-mutation online check        | ✅ before each      | ❌        | ❌             | ❌     | ❌   | ❌                      |
| Manual flush (after re-login)    | ✅                  | ❌        | ❌             | ❌     | ❌   | ❌                      |
| Mutation progress tracking       | ✅ per-item + batch | ❌        | ❌             | ❌     | ❌   | 🟡 per-item             |

### Service Worker

| Feature                     | Swoff                             | Workbox          | Serwist          | next-pwa         | TanStack Query | Apollo | RxDB | TanStack DB |
| --------------------------- | --------------------------------- | ---------------- | ---------------- | ---------------- | -------------- | ------ | ---- | ----------- |
| Generated auditable SW code | ✅ full source                    | 🟡 loader module | 🟡 loader module | 🟡 loader module | ❌             | ❌     | ❌   | ❌          |
| 3-tier config resolution    | ✅ per-request → pattern → global | 🟡 2-tier        | 🟡 2-tier        | 🟡 2-tier        | ❌             | ❌     | ❌   | ❌          |
| SW update versioning        | ✅ 3 modes                        | ✅ runtime       | ✅ runtime       | ✅ runtime       | ❌             | ❌     | ❌   | ❌          |
| Navigation preload          | ✅                                | ✅               | ✅               | ✅               | ❌             | ❌     | ❌   | ❌          |
| SPA fallback for navigation | ✅                                | ✅               | ✅               | ✅               | ❌             | ❌     | ❌   | ❌          |
| SW lifecycle coordination   | ✅ client-injector                | ✅ built-in      | ✅ built-in      | ✅ built-in      | ❌             | ❌     | ❌   | ❌          |

### Auth

| Feature                        | Swoff                                       | Workbox | TanStack Query | Apollo | RxDB | TanStack DB |
| ------------------------------ | ------------------------------------------- | ------- | -------------- | ------ | ---- | ----------- |
| Built-in auth header injection | ✅ 3 types                                  | ❌      | ❌             | ❌     | ❌   | ❌          |
| Auth-aware offline queue       | ✅                                          | ❌      | ❌             | ❌     | ❌   | ❌          |
| Token refresh before expiry    | ✅                                          | ❌      | ❌             | ❌     | ❌   | ❌          |
| 401 detection → clear auth     | ✅ Client auto + SW background notification | ❌      | ❌             | ❌     | ❌   | ❌          |
| Memory-only token storage      | ✅                                          | ❌      | ❌             | ❌     | ❌   | ❌          |
| Offline user data cache        | ✅ IndexedDB                                | ❌      | ❌             | ❌     | ❌   | ✅          |

### GraphQL

| Feature                      | Swoff      | Workbox | TanStack Query | Apollo       | RxDB | TanStack DB        |
| ---------------------------- | ---------- | ------- | -------------- | ------------ | ---- | ------------------ |
| Body-hash GQL caching        | ✅ SHA-256 | ❌      | ❌             | ✅ in-memory | ❌   | 🟡 normalized cols |
| GQL operation-name auto-tags | ✅         | ❌      | ❌             | 🟡 custom    | ❌   | ❌                 |
| GQL offline mutation queue   | ✅         | ❌      | ❌             | ❌           | ❌   | ✅                 |

### Real-time & PWA

| Feature                      | Swoff           | Workbox | TanStack Query | Apollo  | RxDB           | TanStack DB        |
| ---------------------------- | --------------- | ------- | -------------- | ------- | -------------- | ------------------ |
| SSE/WS connection management | ✅ built-in     | ❌      | ❌             | 🟡 link | ✅ replication | 🟡 via sync engine |
| PWA install prompt           | ✅              | ❌      | ❌             | ❌      | ❌             | ❌                 |
| Push notifications           | ✅ + React hook | ❌      | ❌             | ❌      | ❌             | ❌                 |
| Manifest generation          | ✅              | 🟡      | ❌             | ❌      | ❌             | ❌                 |

### Cross-tab & State

| Feature                     | Swoff              | Workbox      | TanStack Query | Apollo          | RxDB | TanStack DB     |
| --------------------------- | ------------------ | ------------ | -------------- | --------------- | ---- | --------------- |
| Cross-tab invalidation sync | ✅ SW-broadcast    | ❌           | 🟡 limited     | ❌              | ❌   | 🟡 LocalStorage |
| Tag registry (IndexedDB)    | ✅ persistent      | ❌           | ❌             | ❌              | ❌   | ❌              |
| Cache persistence model     | Cache API + IDB    | Cache API    | In-memory      | In-memory + IDB | IDB  | IDB + SQLite    |
| State survives page refresh | ✅ Cache API + IDB | ✅ Cache API | ❌             | 🟡 persisted    | ✅   | ✅              |

### Resource Monitoring

| Feature                        | Swoff                              | Workbox         | TanStack Query | Apollo | RxDB                 | TanStack DB |
| ------------------------------ | ---------------------------------- | --------------- | -------------- | ------ | -------------------- | ----------- |
| SW-level fetch timeout         | ✅ global                          | 🟡 per-strategy | ❌             | ❌     | ❌                   | ❌          |
| Timeout broadcasts to window   | ✅                                 | ❌              | ❌             | ❌     | ❌                   | ❌          |
| Storage quota monitoring       | ✅ checkStorage/getStorageEstimate | ❌              | ❌             | ❌     | 🟡 DB engine reports | ❌          |
| Unified notification channel   | ✅ swoff:notification event        | ❌              | ❌             | ❌     | ❌                   | ❌          |
| Precache failure notifications | ✅ per-asset                       | ❌              | ❌             | ❌     | ❌                   | ❌          |

### Developer Experience

| Feature                           | Swoff                      | Workbox             | TanStack Query                | Apollo                       | RxDB                      | TanStack DB                                            |
| --------------------------------- | -------------------------- | ------------------- | ----------------------------- | ---------------------------- | ------------------------- | ------------------------------------------------------ |
| Config-driven setup               | ✅ single file             | ✅ workbox-config   | ❌ code-only                  | ❌ code-only                 | ❌ code-only              | ❌ code-only + schema defs                             |
| Build-tool agnostic               | ✅ any                     | ✅ any              | ✅ any                        | ✅ any                       | ✅ any                    | ✅ any                                                 |
| React hooks                       | ✅ 10                      | 🟡 minimal          | ✅ extensive                  | ✅                           | ✅                        | ✅ useLiveQuery                                        |
| TypeScript declarations generated | ✅                         | ❌                  | ✅ built-in                   | ✅ built-in                  | ✅ built-in               | ✅ built-in                                            |
| Auditable generated code          | ✅ every file              | 🟡 only SW          | ❌                            | ❌                           | ❌                        | ❌                                                     |
| Lines of setup code               | ✅ 0 (1 config)            | 🟡 config + imports | ❌ query client + hooks setup | ❌ ApolloClient + link chain | ❌ schema + RxDB creation | ❌ schema + DB + sync engine + server adapter          |
| Dual database management          | ✅ none (native Cache API) | ✅ none             | ❌ not offline                | ❌ not offline               | 🟡 client-only            | ❌ client SQLite + server DB like a distributed system |

## Deep-Dive Comparisons

Each feature has a dedicated comparison with code examples, tradeoff analysis, and guidance on when to choose what:

- [Prefetch](./comparisons/prefetch.md) — Manual `prefetchCache`, auto-prefetch on pushState, and framework built-in comparison
- [Offline Navigation](./comparisons/offline-navigation.md) — 3 navigation modes, HTML cache isolation, auto-prefetch, per-route fallback rules vs Serwist / next-pwa / Workbox
- [Data Fetching](./comparisons/data-fetching.md) — `useCachedFetch` vs TanStack Query / SWR
- [Caching & Data Layer](./comparisons/caching-and-data.md) — SW-level HTTP caching vs client databases
- [Cache Invalidation](./comparisons/invalidation.md) — Tag-based vs query-key
- [Request Batching](./comparisons/request-batching.md) — 50ms coalescing (unique to Swoff)
- [Offline Queue](./comparisons/offline-queue.md) — Mutation queue vs TanStack Query / Workbox / client DBs
- [Service Worker](./comparisons/service-worker.md) — Generated auditable SW vs Workbox runtime
- [GraphQL](./comparisons/graphql.md) — Body-hash caching vs Apollo/Relay normalized cache
- [Auth](./comparisons/auth.md) — SW-level auth vs manual injection
- [Real-time](./comparisons/realtime.md) — SSE push vs WebSocket subscriptions vs polling
- [Cross-tab Sync](./comparisons/cross-tab.md) — SW broadcast vs BroadcastChannel vs storage events
- [PWA](./comparisons/pwa.md) — Manifest gen + install prompt + push notifications vs vite-plugin-pwa
- [Client DBs](./comparisons/caching-and-data.md#the-client-db-approach-and-its-costs) — RxDB / TanStack DB / ElectricSQL / PowerSync (covered in Caching & Data Layer)
- [Optimistic Updates](./comparisons/optimistic-updates.md) — Why Swoff excludes them (design rationale)
- [Developer Experience](./comparisons/devx.md) — Config-driven code gen vs runtime library setup
- [Resource Monitoring](./comparisons/resource-monitoring.md) — Fetch timeout, storage quota, and unified error notifications
