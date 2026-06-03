# Architecture

Design decisions and rationale behind Swoff's architecture.

---

## Why a service worker + client hybrid?

Swoff splits responsibilities between two scopes:

**Service worker (SW) scope** — runs in a separate thread, survives page navigation, has access to Cache Storage API:
- Intercepts fetch requests and applies caching strategies
- Manages precached assets at install time
- Maintains persistent SSE/WebSocket connections for server push
- Handles push notification events
- Broadcasts invalidation across clients (cross-tab sync)
- Serves cached responses when offline

**Client (window) scope** — runs in the page, has access to DOM, IndexedDB, and React hooks:
- Tracks mutation state per-operation
- Queues offline writes to IndexedDB (the SW could also write, but client-side queuing keeps mutation state accessible to UI components and avoids SW lifecycle complexity)
- Provides reactive hooks (`useCachedFetch`, `useMutationQueue`)
- Manages auth tokens in memory-only storage (never exposed to SW)
- Detects online/offline state and triggers mutation replay

The hybrid model exists because:
- **Stale detection** requires the SW to know about cached responses (SW scope)
- **Background refresh** requires the SW to initiate fetches without page involvement (SW scope)
- **Mutation state tracking** needs per-component reactivity (client scope)
- **IndexedDB writes** for offline queue need to survive page navigation (SW could work for reads, but client writes are simpler and more reliable)

---

## Reactive strategy: staleTime + refresh triggers

Swoff's staleness model is different from a TTL eviction. It is scoped to a single explicit **reactive** strategy rather than spread across all strategies:

- **Fresh**: within `staleTime` seconds of being cached. The SW serves from cache immediately — no network request.
- **Stale**: past `staleTime`. The SW still serves the cached response, but triggers a **background refresh** (batched and rate-limited). The next request gets fresh data.

This means the user **never sees a loading spinner** for cached data. The response is always instant from cache; freshness is maintained in the background.

**staleTime is reactive-only.** It has no meaning on other strategies — each non-reactive strategy has its own simple, predictable contract:

| Strategy | Behavior |
|----------|----------|
| `cache-first` | Serve from cache if available, fall back to network. No staleTime awareness. |
| `network-first` | Try network first, fall back to cache on failure. No staleTime awareness. |
| `stale-while-revalidate` | Serve from cache immediately + always background refresh on every request. Unconditional — no staleTime gate. |
| `cache-only` | Serve from cache only. Never hits the network. |
| `network-only` | Always hit the network. Never caches. |
| `reactive` | Serve from cache. If stale (past `staleTime`), trigger a background refresh. Additionally, can auto-refetch on interval, window focus, or reconnect. |

The key insight: staleTime does not **evict** the entry. It makes the data **usable indefinitely** while keeping it fresh in the background. Background refreshes are batched (`features.refetchQueue.batchSize`) with rate limiting (`features.refetchQueue.batchDelayMs`) to avoid stampedes.

The reactive strategy bundles three optional refresh triggers that all gate through `staleTime`:

| Trigger | Description | Gating |
|---------|-------------|--------|
| `refetchInterval` | Timer-based — re-fetches every N seconds in the background | Only fires if stale (past `staleTime`) |
| `refetchOnFocus` | Fires when the tab regains focus (`visibilitychange`) | Only fires if stale (past `staleTime`) |
| `refetchOnReconnect` | Fires when the browser comes back online | Only fires if stale (past `staleTime`) |

---

## Batch refresh queue (`queueRefresh`)

Instead of fire-and-forget `event.waitUntil(refetch())` on every stale request, Swoff uses a shared batch queue as the single deduped entry point for all proactive refreshes:

1. Any trigger (staleTime expiry, refetchInterval tick, refetchOnFocus, refetchOnReconnect, or tag invalidation) calls `queueRefresh(url)` which adds the URL to a `Map<string, entry>` keyed by cache key (automatic dedup)
2. A single `_processRefreshQueue()` microtask processes URLs in batches of `features.refetchQueue.batchSize`
3. Between batches, a delay of `features.refetchQueue.batchDelayMs` is applied (rate limiting)
4. On each successful refetch, `CACHE_UPDATED` is posted to all connected clients, and any `staleVersions` tracking is cleaned up

**Retry with exponential backoff**: if a refresh fetch fails (network error, non-ok response), the entry is re-queued with an incremented `retryCount`. The retry delay = `features.refetchQueue.retryDelayMs × 2^(retryCount - 1)`. After `features.refetchQueue.maxRetries` consecutive failures, the entry is dropped. A `setTimeout` schedules re-processing after the delay, ensuring the SW stays alive for retries.

This prevents:
- **Stampedes**: 50 stale resources from a page load all get queued, not fetched simultaneously
- **Dedup waste**: Two requests for the same stale URL only produce one refetch
- **SW termination**: The queue promise is shared across all `event.waitUntil()` calls, keeping the SW alive
- **Transient failure loss**: a flaky network doesn't permanently lose the refresh — retries continue with backoff

## Online recovery

When the browser fires `online`, the `client-injector` forwards the event to the SW. The SW runs `handleOnline()` in two phases:

**Phase 1 — staleVersions retry:** Any cache entries that failed to refetch after tag invalidation (while offline) are re-queued first via the batch refresh queue. This ensures invalidation-triggered refetches are prioritized.

**Phase 2 — reactive pattern scan:** The SW scans its reactive route patterns and for each cached URL matching a reactive pattern with `refetchOnReconnect: true`:

1. Resolves the pattern config to get the reactive entry
2. Calls `shouldReactiveRefresh(cachedResponse, config)` which checks if the entry is stale (past `staleTime`, or if `staleTime` is 0/undefined)
3. If stale → queues a refresh via `queueRefresh(url)`

Non-reactive strategies (cache-first, network-first, stale-while-revalidate) do **not** participate in the online recovery scan — their contracts are stateless with respect to staleness. This naturally recovers from: background refresh failure while offline, tab closed while offline, and first request after connectivity returns.

## 3-tier config resolution

The `strategy` field resolves through three priority levels:

1. **Per-request (highest)** — passed as options to `fetchWithCache({ strategy })` or `useCachedFetch()`, or via `X-SW-Strategy` header
2. **Route pattern** — configured in `features.serviceWorker.strategy.patterns` keyed by URL pattern
3. **Global default (lowest)** — configured at `features.serviceWorker.strategy.default`

**Reactive-only fields** (`staleTime`, `refetchInterval`, `refetchOnReconnect`, `refetchOnFocus`) resolve through tiers:

| Field | Tier 1 (per-request) | Tier 2 (route pattern) | Tier 3 (global default) |
|-------|---------------------|----------------------|------------------------|
| `staleTime` | ✅ `X-SW-Stale-Time` header or `fetchWithCache({ staleTime })` | ✅ pattern entry | ✅ `reactive.defaults.staleTime` |
| `refetchInterval` | ❌ SW-initiated timer — not per-request | ✅ pattern entry | ✅ `reactive.defaults.refetchInterval` |
| `refetchOnReconnect` | ❌ SW-initiated — not per-request | ✅ pattern entry | ✅ `reactive.defaults.refetchOnReconnect` |
| `refetchOnFocus` | ❌ SW-initiated — not per-request | ✅ pattern entry | ✅ `reactive.defaults.refetchOnFocus` |

**Example resolution flow:**

```
request to /api/todos with strategy "reactive"
    → tier 1: X-SW-Stale-Time header? no
    → tier 2: "/api/*" has staleTime: 30
    → use 30s

request to /api/posts with strategy "reactive" (no route match)
    → tier 1: X-SW-Stale-Time header? no
    → tier 2: no route pattern
    → tier 3: global staleTime: 0
    → use 0s (always stale)
```

**Why 3 tiers?**

- Per-request override handles edge cases (e.g., a critical endpoint needs immediate freshness)
- Route patterns cover the common case (e.g., `/api/*` is dynamic, `/static/*` is immutable)
- Global default avoids repeating the same config everywhere

---

## Body-hash GraphQL caching

GraphQL queries are POST requests with the query and variables in the body. Standard HTTP caching can't handle this because the URL is always the same but the response differs per query.

Swoff's approach:
1. JSON-stringify `query` + `variables`
2. SHA-256 hash via `crypto.subtle.digest()`
3. First 16 hex chars become the cache key → `X-SW-Cache-Key: gql:<hash>`
4. The SW caches under a virtual URL (`/__swc/gql:<hash>`)
5. Different queries to the same endpoint don't collide

**Why not a normalized entity cache** (like Apollo/Relay)?

- Normalized caches require a schema-aware cache layer that normalizes every response into entities
- This adds significant complexity: schema introspection, entity merging, garbage collection
- Swoff is **config-driven and generates auditable code** — a normalized cache would need runtime logic that can't be generated statically
- The body-hash approach is simple, deterministic, and produces cache keys that are visible in the SW's Cache Storage

**Auto-tags from operation names:**

- `query getTodos { ... }` → tags: `["todos"]`
- `mutation createTodo(...)` → tags: `["todos", "todo"]`
- `mutation updateUserProfile(...)` → tags: `["user", "profile"]`
- These auto-invalidate after mutations, just like REST tag invalidation

---

## Request batching + dedup map

Read requests (GET/HEAD/OPTIONS) to the same URL within a short time window are batched into a single network request via a two-phase system:

**Phase 1 — Batch window (50 ms):** When the first caller requests a URL, a 50 ms timer starts. Any additional callers to the same URL within this window join a shared promise. When the timer fires, one fetch executes and the response is cloned to every caller in the batch.

**Phase 2 — In-flight dedup:** After the batch window closes, the fetch promise is stored in `inFlightRequests` map. If another caller requests the same URL while the fetch is still in-flight, they receive a clone of the existing promise — no second network request.

```
caller A @ 0ms   → batch window starts
caller B @ 10ms  → joins A's batch (single promise)
caller C @ 30ms  → joins A's batch
timer fires @ 50ms → fetch fires once
                    → clone() to A, B, C
caller D @ 80ms  → fetch still in-flight → dedup hit → clone
fetch resolves @ 150ms → cleaned from inFlightRequests
caller E @ 200ms → fresh fetch (no batch, no dedup)
```

**AbortController integration:**

- If an `AbortSignal` is provided, a one-time listener is registered on the signal
- On abort, the entry is removed from the batch/in-flight map so subsequent requests don't get a cancelled promise
- The listener is cleaned up on completion via `responsePromise.finally(cleanup)`
- Before reading from cache in offline mode, `signal.aborted` is checked and throws `AbortError`

**Why batching + dedup?**
- **Batching** handles the "component mount storm" — 10 components mounting in the same render cycle and independently fetching the same URL. Without batching they each fire their own request because none is in-flight yet.
- **Dedup** handles the "late arrival" — a component that mounts moments after the initial fetch has started. Piggybacks on the in-flight request.
- Together they prevent duplicate network requests across the entire component lifecycle.
- Each caller gets a clone — reading the body doesn't affect other consumers.

---

## Mutation queue concurrency

The mutation queue stores writes in IndexedDB and replays them when online. Each mutation is an item with:

```ts
{
  id: string;        // unique ID
  method: string;    // POST, PUT, PATCH, DELETE
  url: string;       // target URL
  body?: unknown;    // request body
  headers?: Record<string, string>;
  tags?: string[];   // invalidation tags
  timestamp: number; // when it was queued
  retryCount: number; // how many times it has been retried
  status?: "pending" | "processing" | "failed";
}
```

**IndexedDB structure:**
- Store: `MutationQueueItem`
- Index: `by-timestamp` (for FIFO replay order)

**Concurrency surface:**
- `getQueuePosition(id)` — returns the 0-based index of a mutation in the queue. Useful for showing "Your mutation is #3 in line"
- `getQueueItems()` — returns all pending items with their status and retry count
- `useMutationQueue()` — now exposes `{ pending, items, lastSync }` so the UI can render per-mutation progress
- `useMutationState(id)` — subscribes to a specific mutation's state changes via the offline/state module

**Batch processing:**
- `batchSize` controls how many mutations fire per progress event
- `batchDelayMs` adds a delay between mutations (rate limiting)
- `maxRetries` limits retries before dropping (with exponential backoff: `retryBackoffMs × 2^retryCount`)
- `flushMutations()` provides a manual trigger (call after re-login to replay 401'd mutations)

## Dual-replay coordination

Mutations queued while offline can be replayed by **both** the service worker (via Background Sync) and the client (when `online` fires). Swoff prevents double-execution with a simple rule:

1. The SW checks for active clients via `self.clients.matchAll()`
2. If any client page is open, the SW **skips processing entirely** — the client always wins when open
3. If no client is open, the SW processes silently via Background Sync

This avoids the complexity of shared locks and timestamps:

- **Page is open**: client handles replay (preferred — has DOM access for progress events, can show real-time UI updates)
- **Page is closed**: SW handles replay via Background Sync (no data loss)
- **Both race**: only the client processes; the SW never interferes when clients exist

Mutations stored client-side go into the same IndexedDB store that the SW reads from (`swoff-queue`). When the SW stores a mutation offline (from `fetch-handler.ts`), it also writes to this store and notifies clients via `MUTATION_STORED` so they can attempt immediate replay.

## Online-status awareness during mutation replay

Both the client and SW mutation processors check `navigator.onLine` per-mutation (not just once at start):

1. Before each mutation replay attempt, the processor checks online status
2. If offline, processing stops immediately and dispatches a `mutation-sync-complete` event with `interrupted: true`
3. On next `online` event or Background Sync trigger, processing resumes from where it left off (FIFO order)
4. This prevents partial network failures from corrupting the queue — if a fetch fails mid-batch due to connectivity loss, the remaining mutations stay queued

Why per-mutation instead of once?
- A user might go back offline mid-replay (e.g. walking through a tunnel)
- The background sync event might fire right as connectivity flickers
- Each mutation can independently fail and be retried; no single mutation's failure blocks others (beyond the interrupt signal)

---

## Server push transport: SSE vs WebSocket

Both transports are supported via `features.serverPush.type`.

| Aspect | SSE | WebSocket |
|--------|-----|-----------|
| Direction | Server → Client only | Bidirectional |
| Protocol | HTTP (standard) | WS (upgraded) |
| Browser support | All modern browsers | All modern browsers |
| Reconnection | Built-in `EventSource` auto-reconnects | Manual reconnection logic needed |
| Binary data | Text only | Text + binary |
| Server complexity | Simple — any HTTP server can send SSE | Requires WebSocket handshake + frame handling |
| Polyfill needed | No | No |

**Default: SSE**. It's simpler, the browser handles reconnection, and Swoff only needs server-to-client invalidation events — no bidirectional communication is required.

The SW manages the connection directly for reliability across page navigations. The client-side `realtime/server-push.ts` is a fallback that starts the connection when the SW is not yet active.

**Server event format (SSE):**
```
event: invalidate
data: {"tags": ["todos", "categories"]}

```

**Server message format (WebSocket):**
```json
{"event": "invalidate", "tags": ["todos", "categories"]}
```

When the SW receives an `invalidate` event, it calls `invalidateByTags(tags)` which:
1. Removes matching cache entries from the runtime cache
2. Tracks stale URLs in `staleVersions` (an in-memory `Map<cacheKey, timestamp>`)
3. Queues each stale URL through the shared batch refresh queue (`queueRefresh`)
4. On successful refetch, removes the entry from `staleVersions` and sends `CACHE_UPDATED` to all clients
5. Any `staleVersions` that remain on next `online` event get priority retry in `handleOnline` phase 1

---

## Auth: memory-only tokens

Auth tokens are stored **in memory only** — never persisted to IndexedDB or localStorage. Only non-sensitive user data (`{ user, expiresAt }`) is stored in IndexedDB for offline user display.

**Security rationale:**
- A token in IndexedDB/localStorage persists on disk and can be extracted by any script running on the same origin
- A token in memory is cleared on page refresh and cannot be accessed by other tabs
- After page refresh, re-login (or token refresh via `refreshPath`) is required

**Auth flow:**
1. User logs in → server returns token + user data
2. `createAuthFromResponse(response)` extracts the token (edit this to match your backend)
3. Token held in memory; user data optionally cached in IndexedDB
4. `fetchWithCache(url, { auth: true })` calls `getAuth()` → `withAuthHeaders(headers, auth)`
5. On 401: `clearAuth()` + dispatch `sw-auth-unauthorized` event

**Auth types:**
- `bearer`: `Authorization: Bearer <token>`
- `cookie`: sets `credentials: "include"`, no explicit header
- `custom`: you edit the generated `withAuthHeaders` function

---

## Cache strategy modes

`features.serviceWorker.strategy.mode` controls when the SW applies caching strategies to requests:

- **`"all"`** (default): every GET/HEAD request passes through the strategy dispatch system, including plain `fetch()` calls. This means third-party libraries that use `fetch()` are also cached.
- **`"explicit-only"`**: only requests with `X-SW-Cache-Strategy` header are processed by the strategy system. `fetchWithCache()` sets this header automatically. Plain `fetch()` calls pass through unmodified.

Use `"explicit-only"` when you want precise control over what gets cached and don't want the SW interfering with non-Swoff fetch calls.

**Request dispatch flow:**

```
navigation (SPA fallback) → precache hit? → strategy dispatch → pass-through

cache-first:
  → serve cache (if available)
  → fall back to network on miss → storeRuntime

network-first:
  → fetch → on failure → serve cache

stale-while-revalidate:
  → serve cache (if available)
  → always queueRefresh(url) (unconditional background refresh)

cache-only:
  → serve cache only

network-only:
  → fetch only (no cache interaction)

reactive:
  → serve cache (if available)
  → shouldReactiveRefresh? → stale? → queueRefresh(url)
  → also: refetchInterval timer, refetchOnFocus, refetchOnReconnect → all gate through staleTime

On "online" event from window:
  → handleOnline(phase 1) → staleVersions retry → queueRefresh()
  → handleOnline(phase 2) → scan reactive patterns with refetchOnReconnect → queueRefresh()

On tag invalidation:
  → delete cache entries
  → mark staleVersions
  → queueRefresh (through batch queue)
  → on success: CACHE_UPDATED + cleanup staleVersions

## Tag introspection

Swoff exposes three introspection functions for debugging and dynamic invalidation:

| Client function | SW handler | Description |
|---|---|---|
| `getUrlsForTag(tag)` → `{ url, actualUrl }[]` | `GET_URLS_FOR_TAG` | Query all URLs cached under a given tag |
| `getTagsForUrl(url)` → `string[]` | `GET_TAGS_FOR_URL` | Query all tags associated with a URL |
| `invalidateMatching(glob)` | `INVALIDATE_MATCHING` | Invalidate all cached entries whose URL matches a glob pattern |

The client functions use `MessageChannel` to communicate with the SW, receiving responses via `channel.port1.onmessage`. The SW handler queries the IndexedDB tag registry (opened via `openTagDB()`) and returns results synchronously through the channel port.

`invalidateMatching` scans all entries in the tag registry, filters by `matchGlob(url, globPattern)`, collects unique tags, and calls `invalidateByTag(tag)` for each matching tag. Invalidated entries are then queue-refreshed through the standard batch queue.
```
