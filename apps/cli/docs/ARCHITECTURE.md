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
- Queues offline writes to IndexedDB (the SW can't write to IndexedDB)
- Provides reactive hooks (`useCachedFetch`, `useMutationQueue`)
- Manages auth tokens in memory-only storage (never exposed to SW)
- Detects online/offline state and triggers mutation replay

The hybrid model exists because:
- **Stale detection** requires the SW to know about cached responses (SW scope)
- **Background refresh** requires the SW to initiate fetches without page involvement (SW scope)
- **Mutation state tracking** needs per-component reactivity (client scope)
- **IndexedDB writes** for offline queue need to survive page navigation (SW could work for reads, but client writes are simpler and more reliable)

---

## staleTime: fresh vs stale data

Swoff's staleness model is different from a TTL eviction:

- **Fresh**: within `staleTime` seconds of being cached. The SW serves from cache immediately — no network request.
- **Stale**: past `staleTime`. The SW still serves the cached response, but triggers a **background refresh**. The next request gets fresh data.

This means the user **never sees a loading spinner** for cached data. The response is always instant from cache; freshness is maintained in the background.

**How staleTime changes each strategy:**

| Strategy | Fresh data (within staleTime) | Stale data (past staleTime) |
|----------|------------------------------|----------------------------|
| `cache-first` | Serve from cache, no network | Serve from cache + background refresh |
| `network-first` | Serve from cache, skip network | Try network first, fall back to cache |
| `stale-while-revalidate` | Serve from cache, no refresh | Serve from cache + background refresh |
| `cache-only` | Serve from cache | Serve from cache + best-effort refresh |
| `network-only` | No effect | No effect |

The key insight: staleTime does not **evict** the entry. It makes the data **usable indefinitely** while keeping it fresh in the background. This is the same model TanStack Query and SWR use.

---

## 3-tier config resolution

Every tunable setting resolves through three priority levels:

1. **Per-request (highest)** — passed as options to `fetchWithCache()` or `useCachedFetch()`
2. **Route pattern** — configured in `features.serviceWorker.strategies` keyed by URL pattern
3. **Global default (lowest)** — configured at `features.serviceWorker.*`

This applies to: `strategy`, `staleTime`, `refetchOnWindowFocus`, `refetchOnReconnect`, `refetchInterval`.

**Example resolution flow for `staleTime`:**

```
fetchWithCache("/api/todos", { staleTime: 10 })
    → tier 1 match: use 10s

fetchWithCache("/api/todos")  (no per-request staleTime)
    → tier 2 check: "/api/*" has staleTime: 30
    → use 30s

no route match either
    → tier 3: use features.serviceWorker.staleTime (global default)
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

## Dedup map + AbortController

In-flight GET requests to the same URL are deduplicated using an in-memory `Map<string, Promise<Response>>`:

1. When `fetchWithCache(url)` is called, check if a request to `url` is already in-flight
2. If yes, return a clone of the shared response promise
3. If no, start a new fetch, store the promise in the map
4. On completion (or failure), remove the entry from the map

**AbortController integration:**

- If an `AbortSignal` is provided, a one-time listener is registered on the signal
- On abort, the entry is removed from the dedup map so subsequent requests don't get a cancelled promise
- The listener is cleaned up on completion via `responsePromise.finally(cleanup)`
- Before reading from cache in offline mode, `signal.aborted` is checked and throws `AbortError`

**Why dedup?**
- Prevents multiple React components mounting simultaneously from firing duplicate network requests
- Reduces server load
- Each caller gets a clone — reading the body doesn't affect other consumers

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
- `useMutationState(id)` — subscribes to a specific mutation's state changes via the mutation-state module

**Batch processing:**
- `batchSize` controls how many mutations fire per progress event
- `batchDelayMs` adds a delay between mutations (rate limiting)
- `maxRetries` limits retries before dropping (with exponential backoff: `retryBackoffMs × 2^retryCount`)
- `flushMutations()` provides a manual trigger (call after re-login to replay 401'd mutations)

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

The SW manages the connection directly for reliability across page navigations. The client-side `server-push.ts` is a fallback that starts the connection when the SW is not yet active.

**Server event format (SSE):**
```
event: invalidate
data: {"tags": ["todos", "categories"]}

```

**Server message format (WebSocket):**
```json
{"event": "invalidate", "tags": ["todos", "categories"]}
```

When the SW receives an `invalidate` event, it calls `invalidateByTags(tags)` which removes matching cache entries and background-refetches them.

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

`features.serviceWorker.cacheStrategy` controls when the SW applies caching strategies to requests:

- **`"all"`** (default): every GET/HEAD request passes through the strategy dispatch system, including plain `fetch()` calls. This means third-party libraries that use `fetch()` are also cached.
- **`"explicit-only"`**: only requests with `X-SW-Cache-Strategy` header are processed by the strategy system. `fetchWithCache()` sets this header automatically. Plain `fetch()` calls pass through unmodified.

Use `"explicit-only"` when you want precise control over what gets cached and don't want the SW interfering with non-Swoff fetch calls.

**Request dispatch flow:**

```
navigation (SPA fallback) → precache hit? → strategy dispatch → pass-through
```
