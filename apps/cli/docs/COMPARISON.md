# Offline-First Infrastructure: Library Comparison

Building a truly offline-first web app typically means stitching together a service worker toolkit, a
server state library, a GraphQL client, an auth solution, push notifications, and a PWA helper — each
with its own config, conventions, and integration headaches. The table below compares how far each
library goes toward the **single offline-first infrastructure** goal, and how many pieces you would
need to assemble yourself.

---

## Libraries Compared

| Library             | Category             | Approach                          | Install size     |
| ------------------- | -------------------- | --------------------------------- | ---------------- |
| **Swoff**           | All-in-one generator | Config-driven build-time code gen | 0 kB runtime     |
| **Workbox**         | SW toolkit           | Build-time + runtime modules      | ~30 kB injected  |
| **vite-plugin-pwa** | SW (Vite)            | Vite plugin wrapping Workbox      | ~30 kB (Workbox) |
| **TanStack Query**  | Server state         | Runtime JS library                | 3.8 kB gzip      |
| **SWR**             | Server state         | Runtime JS library                | 3.3 kB gzip      |
| **RTK Query**       | Server state         | Runtime JS (Redux)                | 2.9 kB + Redux   |
| **Apollo Client**   | GraphQL client       | Runtime JS library                | ~32 kB gzip      |
| **Relay**           | GraphQL client       | Runtime + compiler                | ~20 kB gzip      |
| **urql**            | GraphQL client       | Runtime JS library                | ~8 kB gzip       |
| **RxDB**            | Offline-first DB     | Runtime JS library                | ~40 kB gzip      |
| **Remix**           | Meta-framework       | Server-rendered React framework   | SSR-dependent    |
| **Next.js**         | Meta-framework       | Server-rendered React framework   | SSR-dependent    |
| **TanStack DB**            | Offline-first DB     | Runtime JS library                | ~5 kB gzip       |

---

## Feature Matrix

### Service Worker & Caching Infrastructure

| Feature                               | Swoff          | Workbox            | vite-plugin-pwa | TanStack Query | SWR | RTK Query | Apollo Client | Relay | urql | RxDB        | Remix | Next.js        | TanStack DB            |
| ------------------------------------- | -------------- | ------------------ | --------------- | -------------- | --- | --------- | ------------- | ----- | ---- | ----------- | ----- | -------------- | --------------- |
| SW code generation                    | ✅ Full source | 🟡 Partial runtime | 🟡 Partial (WB) | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌          | ❌    | ❌             | ❌ Fixed script |
| Precaching from build                 | ✅             | ✅                 | ✅              | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌          | ❌    | 🟡 fetch cache | ❌              |
| Runtime caching (pattern)             | ✅             | ✅                 | ✅              | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌          | ❌    | ❌             | ❌              |
| Caching strategies                    | ✅ 6          | ✅ 5               | ✅ 5            | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌          | ❌    | ❌             | ✅ 3            |
| Offline read fallback                 | ✅ SW cache    | ✅ SW cache        | ✅ SW cache     | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ✅ local DB | ❌    | ❌             | ✅ basic        |
| 3-tier config resolution              | ✅             | 🟡 route-only      | 🟡 route-only   | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌          | ❌    | ❌             | ❌              |
| Navigation preload                    | ✅             | ✅                 | ✅              | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌          | ❌    | ❌             | ❌              |
| Dedicated SW ↔ client message passing | ✅             | 🟡 limited         | 🟡 limited      | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌          | ❌    | ❌             | ❌              |

### Data Fetching & Reactivity

| Feature                                | Swoff           | Workbox     | vite-plugin-pwa | TanStack Query | SWR        | RTK Query  | Apollo Client | Relay | urql | RxDB | Remix | Next.js  | TanStack DB |
| -------------------------------------- | --------------- | ----------- | --------------- | -------------- | ---------- | ---------- | ------------- | ----- | ---- | ---- | ----- | -------- | ---- |
| Stale-while-revalidate                 | ✅              | ✅ SW-level | ✅ SW-level     | ✅             | ✅         | ✅         | ✅            | ✅    | ✅   | ❌   | ❌    | ✅ fetch | ❌   |
| Stale-time config                      | ✅ 2-tier       | ✅ SW-level | ✅ SW-level     | ✅             | ❌         | 🟡         | ✅            | ✅    | 🟡   | ❌   | ❌    | ✅ fetch | ❌   |
| Refetch on window focus                | ✅ reactive-only | ❌          | ❌              | ✅             | ✅         | ✅         | ✅            | ❌    | ✅   | ❌   | ❌    | ❌       | ❌   |
| Refetch on reconnect                   | ✅ reactive-only | ❌          | ❌              | ✅             | ✅         | ✅         | ✅            | ❌    | ✅   | ❌   | ❌    | ❌       | ❌   |
| Refetch interval / polling             | ✅ reactive-only | ❌          | ❌              | ✅             | ✅         | ✅         | ✅            | ✅    | ✅   | ❌   | ❌    | ✅ fetch | ❌   |
| Cache deduplication                    | ✅ in-flight    | ❌          | ❌              | ✅             | ✅         | ✅         | ✅            | ✅    | ✅   | ❌   | ❌    | ❌       | ❌   |
| Request cancellation (AbortController) | ✅              | ❌          | ❌              | ✅             | 🟡 limited | 🟡 limited | ✅            | ✅    | ✅   | ❌   | ❌    | ❌       | ❌   |
| Dependent queries                      | ✅ enabled/null | ❌          | ❌              | ✅             | ✅         | ✅         | ✅            | ✅    | ✅   | ❌   | ❌    | ❌       | ❌   |
| Infinite queries / pagination          | ❌              | ❌          | ❌              | ✅             | 🟡 basic   | ❌         | ✅            | ✅    | ✅   | ❌   | ❌    | ❌       | ❌   |
| Prefetching / cache warming            | ✅              | ❌          | ❌              | ✅             | ✅         | ✅         | ✅            | ✅    | ✅   | ❌   | ✅    | ✅       | ❌   |
| Optimistic updates                     | ❌              | ❌          | ❌              | ✅             | ✅         | ✅         | ✅            | ✅    | ✅   | ❌   | ✅    | ✅       | ❌   |
| Mutation state tracking                | ✅              | ❌          | ❌              | ✅             | ✅         | ✅         | ✅            | ✅    | ✅   | ❌   | 🟡    | 🟡       | ❌   |

### Offline Persistence

| Feature                          | Swoff               | Workbox      | vite-plugin-pwa | TanStack Query      | SWR | RTK Query | Apollo Client | Relay | urql        | RxDB      | Remix | Next.js | TanStack DB |
| -------------------------------- | ------------------- | ------------ | --------------- | ------------------- | --- | --------- | ------------- | ----- | ----------- | --------- | ----- | ------- | ---- |
| Offline write queue              | ✅ IndexedDB        | ❌           | ❌              | ❌                  | ❌  | ❌        | ❌            | ❌    | ❌          | ✅        | ❌    | ❌      | ❌   |
| Configurable retry + backoff     | ✅                  | 🟡 basic     | 🟡 basic        | ❌                  | ❌  | ❌        | ❌            | ❌    | ❌          | ❌        | ❌    | ❌      | ❌   |
| Background sync (post-tab-close) | ✅ SW+client        | ✅ WB plugin | ✅ WB plugin    | ❌                  | ❌  | ❌        | ❌            | ❌    | ❌          | ❌        | ❌    | ❌      | ❌   |
| IndexedDB cache persistence      | 🟡 user data        | ❌           | ❌              | 🟡 persister plugin | ❌  | ❌        | ✅            | ❌    | ✅ exchange | ✅ native | ❌    | ❌      | ❌   |
| Cross-tab state sync             | ✅ BroadcastChannel | ❌           | ❌              | 🟡 limited          | ❌  | ❌        | ❌            | ❌    | ❌          | ❌        | ❌    | ❌      | ❌   |
| Client-side queryable DB         | ❌                  | ❌           | ❌              | ❌                  | ❌  | ❌        | ❌            | ❌    | ❌          | ✅ RxDB   | ❌    | ❌      | ❌   |

### Cache Invalidation

| Feature                           | Swoff              | Workbox | vite-plugin-pwa | TanStack Query | SWR          | RTK Query               | Apollo Client    | Relay            | urql             | RxDB           | Remix         | Next.js       | TanStack DB |
| --------------------------------- | ------------------ | ------- | --------------- | -------------- | ------------ | ----------------------- | ---------------- | ---------------- | ---------------- | -------------- | ------------- | ------------- | ---- |
| Tag-based invalidation            | ✅ URL/op-name     | ❌      | ❌              | ✅ query-key   | ✅ key-based | ✅ provides/invalidates | 🟡 custom        | ❌               | ✅ type-based    | ❌             | ❌            | ❌            | ❌   |
| Server push invalidation (SSE/WS) | ✅ built-in        | ❌      | ❌              | ❌             | ❌           | ❌                      | ✅ subscriptions | ✅ subscriptions | ✅ subscriptions | ✅ replication | ❌            | ❌            | ❌   |
| Polling-based invalidation        | 🟡 staleTime+bg-refresh | ❌      | ❌              | ✅             | ✅           | ✅                      | ✅               | ✅               | ✅               | ❌             | ❌            | ✅ fetch      | ❌   |
| Manual invalidation API           | ✅                 | ❌      | ❌              | ✅             | ✅           | ✅                      | ✅               | ✅               | ✅               | ❌             | ✅ revalidate | ✅ revalidate | ❌   |

### Authentication

| Feature                                    | Swoff | Workbox | vite-plugin-pwa | TanStack Query | SWR | RTK Query | Apollo Client | Relay | urql | RxDB | Remix | Next.js | TanStack DB |
| ------------------------------------------ | ----- | ------- | --------------- | -------------- | --- | --------- | ------------- | ----- | ---- | ---- | ----- | ------- | ---- |
| Built-in auth header injection             | ✅    | ❌      | ❌              | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌   | ❌    | ❌      | ❌   |
| Multiple auth types (bearer/cookie/custom) | ✅    | ❌      | ❌              | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌   | ❌    | ❌      | ❌   |
| Token refresh / expiry handling            | ✅    | ❌      | ❌              | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌   | ❌    | ❌      | ❌   |
| 401 auto-handling + clearAuth              | ✅    | ❌      | ❌              | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌   | ❌    | ❌      | ❌   |
| Offline user caching                       | ✅    | ❌      | ❌              | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ✅   | ❌    | ❌      | ❌   |
| Auth state detection (4 states)            | ✅    | ❌      | ❌              | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌   | ❌    | ❌      | ❌   |

### GraphQL

| Feature                              | Swoff                   | Workbox | vite-plugin-pwa | TanStack Query | SWR | RTK Query | Apollo Client    | Relay     | urql        | RxDB           | Remix     | Next.js | TanStack DB |
| ------------------------------------ | ----------------------- | ------- | --------------- | -------------- | --- | --------- | ---------------- | --------- | ----------- | -------------- | --------- | ------- | ---- |
| Native GraphQL client                | ✅ queryGql / mutateGql | ❌      | ❌              | ❌             | ❌  | ❌        | ✅               | ✅        | ✅          | ✅ replication | 🟡 loader | ❌      | ❌   |
| Body-hash / document caching         | ✅ SHA-256 key          | ❌      | ❌              | ❌             | ❌  | ❌        | 🟡 possible      | ❌        | ✅ default  | ❌             | ❌        | ❌      | ❌   |
| Normalized entity cache              | ❌                      | ❌      | ❌              | ❌             | ❌  | ❌        | ✅ InMemoryCache | ✅ DataID | 🟡 exchange | ❌             | ❌        | ❌      | ❌   |
| Auto-invalidation tags from op names | ✅                      | ❌      | ❌              | ❌             | ❌  | ❌        | ❌               | ❌        | ❌          | ❌             | ❌        | ❌      | ❌   |

### PWA

| Feature                        | Swoff           | Workbox    | vite-plugin-pwa | TanStack Query | SWR | RTK Query | Apollo Client | Relay | urql | RxDB | Remix | Next.js | TanStack DB |
| ------------------------------ | --------------- | ---------- | --------------- | -------------- | --- | --------- | ------------- | ----- | ---- | ---- | ----- | ------- | ---- |
| PWA install prompt             | ✅              | ❌         | ✅              | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌   | ❌    | ❌      | ❌   |
| Manifest generation            | ✅              | ❌         | ✅              | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌   | ❌    | ❌      | ❌   |
| Push notifications (VAPID)     | ✅ + React hook | ❌         | ❌              | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌   | ❌    | ❌      | ❌   |
| SW update lifecycle management | ✅ hooks        | ✅ minimal | ✅ minimal      | ❌             | ❌  | ❌        | ❌            | ❌    | ❌   | ❌   | ❌    | ❌      | ❌   |

### Real-time

| Feature                         | Swoff       | Workbox | vite-plugin-pwa | TanStack Query | SWR | RTK Query | Apollo Client | Relay      | urql        | RxDB           | Remix | Next.js | TanStack DB |
| ------------------------------- | ----------- | ------- | --------------- | -------------- | --- | --------- | ------------- | ---------- | ----------- | -------------- | ----- | ------- | ---- |
| SSE connection management       | ✅ built-in | ❌      | ❌              | ❌             | ❌  | ❌        | 🟡 link       | 🟡 network | ✅ exchange | ✅ replication | ❌    | ❌      | ❌   |
| WebSocket connection management | ✅ built-in | ❌      | ❌              | ❌             | ❌  | ❌        | ✅ link       | ✅ network | ✅ exchange | ✅ replication | ❌    | ❌      | ❌   |
| Auto-reconnect with backoff     | ✅          | ❌      | ❌              | ❌             | ❌  | ❌        | 🟡 link       | 🟡         | ✅ exchange | ✅             | ❌    | ❌      | ❌   |

### Developer Experience

| Feature                       | Swoff                | Workbox              | vite-plugin-pwa | TanStack Query | SWR          | RTK Query    | Apollo Client | Relay        | urql         | RxDB         | Remix        | Next.js      | TanStack DB             |
| ----------------------------- | -------------------- | -------------------- | --------------- | -------------- | ------------ | ------------ | ------------- | ------------ | ------------ | ------------ | ------------ | ------------ | ---------------- |
| TypeScript support            | ✅ full              | ✅ typed             | ✅ typed        | ✅ full        | ✅           | ✅           | ✅            | ✅ (codegen) | ✅           | ✅           | ✅           | ✅           | ❌               |
| Zero runtime dependencies     | ✅ generated code    | ❌ runtime modules   | ❌ Workbox      | ❌ 3.8 kB      | ❌ 3.3 kB    | ❌ +Redux    | ❌ 32 kB      | ❌ 20 kB     | ❌ 8 kB      | ❌ 40 kB     | ❌ SSR       | ❌ SSR       | ✅ single script |
| Generated auditable code      | ✅ full source       | ❌ obfuscated        | ❌ obfuscated   | ❌ runtime     | ❌ runtime   | ❌ runtime   | ❌ runtime    | ❌ runtime   | ❌ runtime   | ❌ runtime   | ❌ runtime   | ❌ runtime   | ✅               |
| Config-driven setup           | ✅ swoff.config.json | ✅ workbox-config.js | ✅ vite.config  | ❌ code-only   | ❌ code-only | ❌ code-only | ❌ code-only  | ❌ code-only | ❌ code-only | ❌ code-only | ❌ code-only | ❌ code-only | ❌               |
| Build-tool agnostic           | ✅ any tool          | ✅ any tool          | ❌ Vite only    | ✅ any         | ✅ any       | ✅ any       | ✅ any        | ✅ any       | ✅ any       | ✅ any       | ✅ any       | ❌ Next      | ✅ any           |
| React hooks                   | ✅ 11 hooks          | 🟡 minimal           | 🟡 minimal      | ✅ extensive   | ✅           | ✅           | ✅            | ✅           | ✅           | ✅           | ✅           | ✅           | ❌               |
| Vue hooks                     | ❌ planned           | ❌                   | ❌              | ✅ via adapter | ✅ swrv      | ❌           | 🟡            | ❌           | ✅ @urql/vue | ✅           | ❌           | ❌           | ❌               |
| Svelte hooks                  | ❌ planned           | ❌                   | ❌              | ✅ via adapter | ❌           | ❌           | ❌            | ❌           | ❌           | ✅           | ❌           | ❌           | ❌               |
| Solid / other framework hooks | ❌ planned           | ❌                   | ❌              | ✅ Solid       | ❌           | ❌           | ❌            | ❌           | ❌           | ❌           | ❌           | ❌           | ❌               |

### Offline-First Infrastructure (the integration gap)

| Feature                                       | Swoff           | Workbox       | vite-plugin-pwa | TanStack Query | SWR           | RTK Query     | Apollo Client | Relay        | urql        | RxDB       | Remix     | Next.js   | TanStack DB |
| --------------------------------------------- | --------------- | ------------- | --------------- | -------------- | ------------- | ------------- | ------------- | ------------ | ----------- | ---------- | --------- | --------- | ---- |
| Unified config for ALL concerns               | ✅ single-file  | ❌ SW only    | ❌ SW only      | ❌ fetch only  | ❌ fetch only | ❌ fetch only | ❌ GQL only   | ❌ GQL only  | ❌ GQL only | ❌ DB only | ❌ server | ❌ server | ❌   |
| Hybrid SW ↔ client architecture               | ✅ built-in     | 🟡 sw->client | 🟡 sw->client   | ❌             | ❌            | ❌            | ❌            | ❌           | ❌          | ❌         | ❌        | ❌        | ❌   |
| Single CLI init + generate setup              | ✅              | 🟡 wizard     | ✅ vite add     | ❌             | ❌            | ❌            | ❌            | ❌           | ❌          | ❌         | ❌        | ❌        | ❌   |
| Deterministic cache keys for POST/GQL         | ✅ SHA-256 hash | ❌            | ❌              | ❌             | ❌            | ❌            | ❌ in-memory  | ❌ in-memory | ✅ document | ❌         | ❌        | ❌        | ❌   |
| Auth-aware offline queue (re-fetch at replay) | ✅              | ❌            | ❌              | ❌             | ❌            | ❌            | ❌            | ❌           | ❌          | ❌         | ❌        | ❌        | ❌   |
| SW ↔ client message passing for invalidation  | ✅              | ❌            | ❌              | ❌             | ❌            | ❌            | ❌            | ❌           | ❌          | ❌         | ❌        | ❌        | ❌   |

---

## Detailed Comparison by Category

### SW & Caching Infrastructure

Swoff generates a **full human-readable service worker** from `swoff.config.json`. Every line of
caching logic is visible and editable. Workbox injects an opaque runtime that loads `workbox-*`
modules — you control behavior through APIs but cannot read the generated code. vite-plugin-pwa
inherits the same opacity from Workbox. TanStack DB is the newest library in the ecosystem,
offering a reactive offline-first database with sync capabilities.

Swoff is the only SW toolkit that provides **3-tier config resolution** for strategy selection:
per-request overrides (tier 1, highest priority), URL pattern matches (tier 2), and global
defaults (tier 3). Reactive-only fields (staleTime, refetch triggers) use a 2-tier resolution
(per-request or route pattern) since they are scoped to the reactive strategy.

### Data Fetching & Reactivity

TanStack Query dominates this category with the richest feature set: infinite queries, optimistic
updates, extensive devtools, and adapters for React, Vue, Svelte, and Solid. SWR and RTK Query
are strong competitors with similar core features. Swoff covers the most common patterns
(stale-while-revalidate, refetch triggers, dedup, cancellation, dependent queries, prefetching,
mutation state) but does not yet offer infinite queries or optimistic updates — these areas are
expected in a future release. Apollo/Relay/urql provide these features within their GraphQL
ecosystem but not for REST.

**Key differentiator:** Swoff's reactive strategy bundles staleTime + refetch triggers (focus,
reconnect, interval) into a single coherent strategy with no cross-cutting flags. TanStack
Query scatters these as per-query options that overlap with its staleTime, creating a
complex flag interaction surface.

### Offline Persistence

This is the widest gap between libraries. Swoff and RxDB are the only libraries with a
full offline write queue, but they serve different purposes:

- **Swoff** queues HTTP mutations (POST/PUT/DELETE) to IndexedDB while offline and replays
  them when the connection returns. It supports configurable batch size, delay between mutations,
  max retries, exponential backoff, and **background sync** (processes even after tab close).
  Auth headers are re-fetched at replay time, handling token expiry during offline periods.
- **RxDB** is a full client-side NoSQL database with replication to a backend. It provides
  reactive queries, schema validation, and encryption — but does not abstract HTTP fetch calls
  or integrate with the SW cache.

**Workbox** provides `workbox-background-sync` for replaying failed requests, but it lacks
batching, rate limiting, backoff, and auth-aware replay. No other library provides an offline
write queue.

**Cross-tab sync** is unique to Swoff. When one tab performs a mutation or auth change, all
other open tabs receive the event via `BroadcastChannel` with a `localStorage` fallback.

### Cache Invalidation

Swoff and TanStack Query both offer tag-based invalidation, but through different mechanisms:

- **Swoff** generates tags from URL paths (`/api/todos/42` → `["todos", "todo:42"]`) and
  operation names (`getTodos` → `["todos"]`) at the SW level. Invalidation removes cache
  entries and background-refetches them.
- **TanStack Query** uses manual query keys. You define keys per query and invalidate via
  `queryClient.invalidateQueries({ queryKey: ["todos"] })`. No URL-to-tag derivation.

**Server push invalidation** (SSE or WebSocket) is built into Swoff. The SW maintains a
persistent connection and calls `invalidateByTags()` when the server sends an invalidation
event. Apollo/urql/RxDB support real-time updates but require subscriptions or replication
setup. TanStack Query and others have no built-in push mechanism.

### Authentication

Swoff is the only library with **first-class auth integration across all concerns**:

- Three auth types: `bearer`, `cookie`, `custom`
- Automatic token injection on `fetchWithCache(url, { auth: true })`
- Automatic 401 detection → `clearAuth()` + `sw-auth-unauthorized` event
- Token refresh via `ensureValidAuth()` using the configured `refreshPath`
- Offline user caching in IndexedDB for offline user display
- Auth state detection (4 states: online+authed, online+guest, offline+authed, offline+guest)

All other libraries require you to implement token management, header injection, 401 handling,
and auth state reactivity yourself — often adding another library (e.g., Auth0, Firebase Auth,
or a custom solution) on top.

### GraphQL

Apollo Client and Relay offer sophisticated normalized entity caches with schema-aware
deduplication and garbage collection. urql offers document caching with an optional
normalized exchange.

Swoff takes a simpler approach: **body-hash caching**. The query + variables are SHA-256
hashed into a deterministic cache key (`X-SW-Cache-Key: gql:<hash>`), and the SW caches
under a virtual URL. This avoids the complexity of a normalized cache while still providing
deterministic cache keys and offline access. Operation names auto-generate invalidation tags
for post-mutation cache busting.

Swoff does **not** have a normalized entity cache — queries that overlap in data will cache
separately. This is a deliberate trade-off for simplicity and auditable generated code.

### Developer Experience

Swoff's **zero runtime dependencies** approach is unique among the actively maintained
libraries. All code is generated as plain JS/TS files in `swoff/` during build time. The
`@swoff/cli` package is never imported at runtime. The generated code uses only browser
APIs (Cache API, IndexedDB, BroadcastChannel, Push API, etc.).

This means:

- **No bundle size impact** from the SW or client utilities (the generated code is your code)
- **Full auditability** — every line can be read, edited, and committed to version control
- **No version mismatches** between the CLI and runtime — the generated code is pinned to your project
- **No dependency on the library's release cycle** — you own the source

TanStack Query (3.8 kB), SWR (3.3 kB), Apollo (32 kB), and others are lightweight individually,
but when you need to combine a server state library + SW toolkit + auth + GraphQL + PWA,
the cumulative bundle and integration complexity grows quickly.

---

## Ecosystem reach

Swoff's architecture is fundamentally different from every library in this comparison —
it operates at the **browser infrastructure layer** (Service Worker + `fetch` event), not
the application layer. This means it works with **any** backend (PHP, Laravel, Django, Rails,
Go, Java), **any** frontend (React, Vue, Svelte, HTMX, vanilla JS), and **any** rendering
strategy (SSR, SSG, SPA, islands, HTML-over-the-wire).

See [ECOSYSTEM.md](./ECOSYSTEM.md) for the full breakdown by ecosystem category.

---

## Honest Assessment

Swoff is **early** compared to most libraries in this comparison. TanStack Query has years
of community growth, React Server Components support, and framework adapters for React, Vue,
Svelte, and Solid. Workbox is maintained by the Google Chrome team and has the most
battle-tested SW infrastructure. Apollo and Relay have sophisticated normalized caches that
Swoff does not attempt to replicate.

**Where Swoff still needs to catch up:**

- **Framework hooks**: currently React only. Vue, Svelte, and Solid adapters are planned.
- **Infinite queries / pagination**: not yet built. TanStack Query's `useInfiniteQuery` is
  the gold standard here.
- **Optimistic updates**: not yet built. Requires integration with the mutation-state system.
- **Normalized GraphQL cache**: Swoff's body-hash caching is simple and reliable but cannot
  merge overlapping query results like Apollo/Relay.
- **SSR / RSC data loading**: Swoff is a client-side tool and does not participate in server
  rendering data fetching.
- **Devtools**: no browser extension or devtools panel yet (TanStack Query's devtools are
  excellent).

**Where Swoff leads:**

- **Offline-first integration**: no other library combines SW caching, data fetching, auth,
  mutation queue, GraphQL, PWA, push notifications, cross-tab sync, and real-time invalidation
  in a single config-driven system. Achieving the same with other libraries means integrating
  4-6 separate tools.
- **Zero runtime dependencies**: the generated code has no imports from the library — no
  bundle impact, no version mismatches, fully auditable.
- **Auth across the stack**: auth is not an afterthought. Token injection, 401 handling,
  refresh, offline user caching, and state detection are built into the fetch wrapper, the
  mutation queue (re-fetches auth at replay time), and the SW.
- **Generated auditable code**: every line of the SW, cache logic, auth, and hooks is visible
  in `swoff/`. You can read it, edit it, and commit it.
- **Config-driven resolution**: a single JSON file controls SW caching strategies, staleTime,
  refetch behavior, and all features — with a consistent priority model (3-tier for strategy,
  2-tier for reactive-only fields).
