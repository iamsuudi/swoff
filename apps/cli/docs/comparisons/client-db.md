# Client Databases: Swoff vs RxDB / TanStack DB / ElectricSQL / PowerSync

Client databases (RxDB, TanStack DB, ElectricSQL, PowerSync) embed a local database engine (IndexedDB, SQLite via WASM, or PGlite) and synchronize it with the server. They solve a fundamentally different problem than SW-level caching — and the choice between them determines your entire offline architecture.

## The fundamental difference

**Swoff operates at the HTTP cache layer** — the Service Worker intercepts `fetch` events, caches responses by URL, and serves them on subsequent requests. The data retains its server shape (JSON, HTML, images, etc.).

**Client DBs operate at the database layer** — a local DB (IndexedDB, SQLite) stores normalized entities with schemas, relationships, and indexes. The sync engine pushes local changes to the server and pulls server changes back, with conflict resolution.

```
Swoff architecture:
  HTTP Request → SW Cache Storage API → Response (server-shaped)

Client DB architecture:
  Local DB (SQLite/IDB) ← Sync Engine → Server DB
  App reads from local DB via queries/observables
```

## What client DBs excel at

Client databases are the right choice when your app is built *around* a local data model:

- **Collaborative editing** — real-time sync of document changes with CRDT conflict resolution.
- **Inventory / catalog apps** — offline CRUD with local queries (filter, sort, search) on cached data.
- **Form-heavy offline apps** — draft management, partial submissions, multi-step workflows.
- **Apps needing client-side aggregation** — SUM, COUNT, GROUP BY on synced data without round-tripping to the server.
- **Schema-aware sync** — incremental row-level replication instead of full HTTP responses.

## What Swoff excels at

Swoff is the right choice when your app follows a standard HTTP API pattern:

- **CRUD over REST/GraphQL** — standard endpoints, standard HTTP caching.
- **Content-centric apps** — blogs, dashboards, e-commerce, news feeds.
- **Third-party API integration** — cache responses from external APIs the SW intercepts.
- **Multi-framework / multi-page apps** — SW cache is framework-agnostic.
- **Progressive enhancement** — offline support added to an existing HTTP API without schema changes.

## Comparison table

| Aspect | Swoff | RxDB | TanStack DB | ElectricSQL | PowerSync |
|---|---|---|---|---|---|
| **Paradigm** | SW HTTP cache | Client DB + replication | Client DB + differential dataflow | Client DB + PGlite WASM | Client DB + SQLite |
| **Storage engine** | Cache Storage API + IDB | IndexedDB | SQLite (via better-sqlite3 or WASM) | PGlite (PostgreSQL WASM) | SQLite (via SQL.js or native) |
| **WASM download** | ❌ None | ❌ None | 🟡 Optional | ✅ ~3 MB gzip | ✅ ~2 MB gzip |
| **Schema required** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Dual DB management** | ❌ No | ✅ Client + server schemas must stay in sync | ✅ Client + server schemas must stay in sync | ✅ Client + server schemas must stay in sync | ✅ Client + server schemas must stay in sync |
| **Conflict resolution** | ❌ Last-write-wins | ✅ CRDTs, last-write-wins, custom | ✅ Custom merge functions | ✅ Last-write-wins | ✅ Last-write-wins, custom |
| **Client-side queries** | ❌ Server-shaped responses only | ✅ SQL + MongoDB-like queries | ✅ Full SQL | ✅ Full SQL (PostgreSQL-compatible) | ✅ Full SQL |
| **Client-side joins** | ❌ Not possible | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Incremental sync** | ❌ Full HTTP responses | ✅ Row-level replication | ✅ Differential dataflow | ✅ Logical replication | ✅ Row-level |
| **Native fetch caching** | ✅ All HTTP requests | ❌ Bypasses cache | ❌ Bypasses cache | ❌ Bypasses cache | ❌ Bypasses cache |
| **Third-party API caching** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Auth integration** | ✅ Built-in (3 types, refresh, 401) | ❌ Manual | ❌ Manual | ❌ Manual | ❌ Manual |
| **PWA + push** | ✅ Built-in | 🟡 Optional | ❌ Not built-in | ❌ Not built-in | ❌ Not built-in |
| **SW integration** | ✅ Full (SW cache + invalidation + sync) | ❌ None (managing SW separately) | ❌ None | ❌ None | ❌ None |
| **Runtime deps** | 0 kB (generated code) | ~40 kB gzip | ~6 kB core + SQLite WASM | ~3 MB gzip | ~2 MB gzip |
| **Setup cost** | 1 config file | Schema defs + RxDB creation + sync setup | Schema + DB + sync engine + server adapter | Schema + migrations + sync server | Schema + sync engine + server connector |
| **Privacy-safe logout** | ✅ `clearAuth()` wipes all caches | ❌ All data persists in IDB — must manually purge | ❌ SQLite retains all data — must manually purge | ❌ PGlite retains all data — must manually purge | ❌ SQLite retains all data — must manually purge |
| **Ideal for** | HTTP API apps, content sites, dashboards | Collaborative apps, offline-first DB apps | Offline-first apps needing SQL | PostgreSQL-based apps | Mobile-first offline apps |

## The dual-DB maintenance tax

Client databases require the developer to maintain two databases with the same schema:

- Every schema migration (add a column, change a type, rename a field) must be applied to both the server DB and the client DB schema definition.
- Sync engine configuration must know which tables/collections to replicate, which fields to include, and how to map types between client and server.
- Conflict resolution strategies must be defined per-collection or per-field.

Swoff has no schemas. The server defines the API response shape, and the SW caches it as-is. A new field in the API response is automatically cached without any schema change on the client. This is less expressive than a client DB (no joins, no aggregation) but eliminates an entire category of maintenance work.

## Privacy-safe logout

Client databases persist all data in IndexedDB or SQLite indefinitely. When a user logs out:

- **Swoff:** `clearAuth()` wipes tokens from memory, user cache from IndexedDB, and the mutation queue. The next user on the same device starts fresh.
- **Client DBs:** All data remains in the local database. Depending on the sync engine, the previous user's data may be visible to the next user. The developer must manually purge the local database on logout — and this is often forgotten.

## When to choose what

**Choose Swoff when:**
- Your app follows a standard HTTP API pattern (REST, GraphQL over HTTP)
- You want offline support without adding a client database
- You don't need client-side joins, aggregation, or full-text search
- You value zero WASM download and zero runtime dependencies
- You need third-party API caching
- You want privacy-safe logout without manual data purging
- You want to add offline support to an existing app without schema changes

**Choose a client DB when:**
- Your app is built around a local data model with offline CRUD
- You need client-side SQL queries (joins, aggregation, full-text search)
- You need incremental row-level sync (not full HTTP responses)
- You need conflict resolution beyond last-write-wins
- Your team is comfortable with dual-DB management and sync engine maintenance
- Your app can tolerate a 2-3 MB WASM download for offline capabilities
