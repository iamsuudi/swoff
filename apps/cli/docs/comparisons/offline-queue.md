# Offline Write Queue: Swoff vs Client DB Mutation Queues

Offline write queuing captures mutations (POST, PUT, PATCH, DELETE) when offline and replays them when connectivity returns. The queuing strategy determines reliability, conflict behavior, and whether mutations survive tab close.

## How Swoff does it

Swoff implements a dual-layer mutation queue: primary storage in IndexedDB (survives tab close), with Service Worker fallback via the Background Sync API (survives SW termination).

```
Offline mutation → IndexedDB (queue)
  → processMutationQueue() on online event
    → SW replays mutations sequentially
      → per-mutation online check (aborts batch if offline mid-way)
      → configurable retry with exponential backoff
      → progress events per batch item
      → SUCCESS → invalidate cache tags → refetch → UI updates
      → FAILURE → retry or drop based on maxRetries
```

**Key properties:**
- **Storage:** IndexedDB (persists across tab close, SW restart, browser restart).
- **SW fallback:** When all tabs close, the SW wakes via Background Sync API and replays the queue.
- **Per-mutation online check:** Before each replay, checks `navigator.onLine`. If offline mid-batch, remaining mutations stay queued.
- **Configurable retry:** `maxRetries` (cap or `Infinity`), `retryBackoffMs` (exponential: `backoff × 2^retryCount`), `batchSize`, `batchDelayMs`.
- **Queue introspection:** `getQueuePosition(id)`, `getQueueItems()`, `useMutationQueue()` for showing "3 changes saved offline" in the UI.
- **Dual-replay prevention:** SW skips Background Sync replay if any client page is open — the client-side `processMutationQueue()` handles it.
- **Auth-aware:** If the auth token expires mid-batch, the SW attempts silent refresh before retrying. If refresh fails, the batch stops.

## How competitors handle it

**TanStack Query:** No built-in offline mutation queue. Failed mutations are simply rejected. The `retry` option retries in-memory only — does not survive tab close.

**Workbox:** A basic `backgroundSync` plugin can queue failed requests in IndexedDB and replay them via Background Sync. No per-mutation progress tracking, no batch processing, no auth-aware replay, no queue introspection.

**Client DBs (RxDB, TanStack DB, ElectricSQL):** Offline writes are their primary use case. Mutations go to the local database immediately, the sync engine pushes changes when online, and conflicts are resolved via strategies (last-write-wins, CRDTs, custom merge). This comes with dual database management, schema coupling, WASM downloads, and a sync engine maintained on both client and server.

## Comparison table

| Feature | Swoff | TanStack Query | Workbox | RxDB / TanStack DB |
|---|---|---|---|---|
| **Queue storage** | IndexedDB (persistent) | In-memory (lost on close) | IndexedDB | Local DB (IDB / SQLite) |
| **Survives tab close** | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| **Survives SW restart** | ✅ Yes (Background Sync) | ❌ No SW | ✅ Yes (Background Sync) | N/A |
| **Per-mutation online check** | ✅ Before each replay | ❌ Not applicable | ❌ Not applicable | N/A (sync engine handles) |
| **Batch processing** | ✅ Configurable size + delay | ❌ Not applicable | ❌ Single replay | N/A (continuous sync) |
| **Retry with backoff** | ✅ Exponential | 🟡 Basic retry (no backoff) | ✅ Basic retry | N/A (continuous sync) |
| **Queue introspection** | ✅ Position, items, lastSync, isProcessing | ❌ Not supported | ❌ Not supported | ✅ Local DB queries |
| **Progress events** | ✅ Per-batch + per-item | ❌ Not supported | ❌ Not supported | ✅ Replication status |
| **Dual-replay prevention** | ✅ SW skips if client open | ❌ Not applicable | ❌ May duplicate | N/A |
| **Auth-aware replay** | ✅ Silent refresh + stop on failure | ❌ Not supported | ❌ Not supported | ❌ Not supported |
| **Conflict resolution** | ❌ Last-write-wins only | ❌ Not applicable | ❌ Not applicable | ✅ CRDTs, custom merge |
| **Schema coupling** | ❌ No schema needed | ❌ No schema needed | ❌ No schema needed | ✅ Requires schema definition + migrations |
| **Bundle cost** | 0 kB (generated code) | Included in ~20 kB | ~30 kB | ~40 kB (RxDB) / ~6 kB + SQLite WASM (TanStack DB) |

## The Telegram pattern

Swoff's mutation queue follows the same pattern as Telegram's offline behavior: mutations appear as "pending" (with a clock icon) until the server confirms them. Users cannot edit or interact with a pending mutation until it syncs. This constraint eliminates phantom ID reconciliation — a pending mutation has no server-assigned ID, so no dependent action can reference it incorrectly.

Client DBs take the opposite approach: optimistic writes to the local DB assign temporary IDs, and the sync engine replaces them with server IDs. This enables instant UI but introduces phantom ID reconciliation complexity across dependent mutations.
