# Prefetch: Swoff vs Framework Built-Ins

Prefetch fetches resources before navigation so the response is available instantly. The storage layer — Cache Storage API (disk, survives reloads) vs in-memory (lost on navigation) vs client DB (data without an app shell) — determines whether prefetch actually delivers instant UX or just shifts the network timing.

## How each system prefetches

**Swoff** stores full HTTP responses in the Cache Storage API (disk-backed, survives reloads, works offline). `prefetchCache(url)` is a single call for any resource — API endpoints, images, GraphQL POST bodies, third-party URLs. Runs in the SW thread, no framework coupling.

**Framework built-ins (Next.js, TanStack Router, Remix, SvelteKit)** store route-level data in memory (Map/`CacheNode`/`load_cache`), lost on reload, main thread, framework-coupled. Remix uses the browser HTTP cache which survives reloads but depends on `Cache-Control` headers. All are limited to route data — no API endpoints, no images, no third-party resources.

**Client DBs (RxDB, TanStack DB, ElectricSQL, PowerSync)** store synced data in IndexedDB/SQLite but cannot cache the app shell (HTML/CSS/JS). Without a separate Service Worker, the app can't load offline, making the prefetched data inaccessible. On first load with no sync history, there's nothing to prefetch. The 2–3 MB WASM download is overhead for what the native Cache Storage API provides at zero cost.

## Comparison table

| Dimension | Swoff | Framework prefetch | Client DBs |
|---|---|---|---|
| **Storage** | SW Cache API (disk) | In-memory (Map/CacheNode) — Remix uses HTTP cache | Local DB (IDB / SQLite) |
| **Survives hard nav?** | ✅ Yes | ❌ No (🟡 Remix via HTTP cache headers) | ✅ Data only — app shell not cached |
| **App shell cached?** | ✅ Yes — HTML/CSS/JS | ✅ Route JS via bundler | ❌ Requires separate SW |
| **Scope** | Any URL | Route data only | Synced collections only |
| **Offline** | ✅ Native | ❌ Not built-in | ❌ App can't load without SW |
| **Thread** | SW thread | Main thread | Main thread |
| **Framework coupling** | None | Route-coupled | Schema-coupled |
| **Runtime cost** | 0 kB (generated) | ~15–100 kB | ~40 kB–3 MB + WASM |

## What makes the difference

**Storage layer.** SW Cache Storage persists across reloads. In-memory (frameworks) is wiped on navigation. Local DB (client DBs) persists data but not the app shell — data without a UI is useless offline.

**Thread isolation.** Swoff prefetches in the SW thread, invisible to the main thread. Frameworks and client DBs compete with rendering on the main thread.

**Scope.** Swoff prefetches any URL with one call. Frameworks are limited to route data. Client DBs are limited to what the sync engine has replicated.

**The data-only gap.** Client DBs require a separate SW to cache the app shell — the libraries don't generate or manage it. The developer must solve app loading independently. Swoff caches everything (shell + data) in one system with zero additional setup.
