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

| Feature                           | Swoff               | Workbox            | TanStack Query | Apollo           | RxDB           | TanStack DB             |
| --------------------------------- | ------------------- | ------------------ | -------------- | ---------------- | -------------- | ----------------------- |
| SW code generation                | ✅ Full source      | 🟡 Partial runtime | ❌             | ❌               | ❌             | ❌                      |
| Caching strategies                | ✅ 6                | ✅ 5               | ❌             | ❌               | ❌             | 🟡 via Query            |
| Stale-while-revalidate            | ✅                  | ✅                 | ✅             | ✅               | ❌             | ✅ via Query            |
| Offline write queue               | ✅ IndexedDB        | 🟡 basic           | ❌             | ❌               | ✅             | ✅ optimistic + offline |
| Configurable retry+backoff        | ✅                  | 🟡                 | ❌             | ❌               | ❌             | 🟡 via Query            |
| Background sync (post-tab-close)  | ✅ SW+client        | ✅ plugin          | ❌             | ❌               | ❌             | ✅ offline tx           |
| Cross-tab state sync              | ✅ BroadcastChannel | ❌                 | 🟡 limited     | ❌               | ❌             | 🟡 LocalStorage         |
| Tag-based invalidation            | ✅ URL/op-name      | ❌                 | ✅ query-key   | 🟡 custom        | ❌             | ❌ query-key only       |
| Server push invalidation (SSE/WS) | ✅ built-in         | ❌                 | ❌             | ✅ subscriptions | ✅ replication | 🟡 via sync engine      |
| Built-in auth header injection    | ✅ 3 types          | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Auth-aware offline queue          | ✅                  | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Body-hash GQL caching             | ✅                  | ❌                 | ❌             | ✅ in-memory     | ❌             | 🟡 normalized cols      |
| PWA install prompt                | ✅                  | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| Push notifications                | ✅ + React hook     | ❌                 | ❌             | ❌               | ❌             | ❌                      |
| SSE/WS connection mgmt            | ✅ built-in         | ❌                 | ❌             | 🟡 link          | ✅ replication | 🟡 via sync engine      |
| Zero runtime dependencies         | ✅ generated code   | ❌ Workbox         | ❌ 3.8 kB      | ❌ 32 kB         | ❌ 40 kB       | ❌ + Query + DB         |
| Config-driven setup               | ✅ single file      | ✅ workbox-config  | ❌ code-only   | ❌ code-only     | ❌ code-only   | ❌ code-only            |
| Build-tool agnostic               | ✅ any              | ✅ any             | ✅ any         | ✅ any           | ✅ any         | ✅ any                  |
| React hooks                       | ✅ 11               | 🟡 minimal         | ✅ extensive   | ✅               | ✅             | ✅ useLiveQuery         |

## Key differentiators

**Where Swoff leads:**

- **Offline-first integration** — combines SW caching, data fetching, auth, mutation queue, GraphQL, PWA, push notifications, cross-tab sync, and real-time invalidation in a single config-driven system. Others require 4-6 separate tools.
- **Zero runtime dependencies** — generated code uses only browser APIs. No bundle impact, no version mismatches.
- **Auth across the stack** — token injection, 401 handling, refresh, offline user caching, and state detection built into fetch wrapper, mutation queue, and SW.
- **Generated auditable code** — every line visible in `swoff/`. Read, edit, and commit it.
- **Config-driven resolution** — 3-tier priority for strategy (per-request → route pattern → global default).

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
