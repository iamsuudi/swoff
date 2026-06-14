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
4. On each successful refetch, `CACHE_UPDATED` is posted to all connected clients

**Retry with exponential backoff**: if a refresh fetch fails (network error, non-ok response), the entry is re-queued with an incremented `retryCount`. The retry delay = `min(backoffMs × 2^retryCount, maxBackoffMs) + jitter`. The `RetryConfig` is unified across all retry contexts: `{ maxRetries, backoffMs, maxBackoffMs, jitterMs }`. After `maxRetries` consecutive failures, the entry is dropped. A `setTimeout` schedules re-processing after the delay, ensuring the SW stays alive for retries.

This prevents:
- **Stampedes**: 50 stale resources from a page load all get queued, not fetched simultaneously
- **Dedup waste**: Two requests for the same stale URL only produce one refetch
- **SW termination**: The queue promise is shared across all `event.waitUntil()` calls, keeping the SW alive
- **Transient failure loss**: a flaky network doesn't permanently lose the refresh — retries continue with backoff

## Online recovery

When the browser fires `online`, the `client-injector` forwards the event to the SW. The SW runs `handleOnline()` which iterates its in-memory `_reactiveRegistry` Map (populated per-entry at cache-write time and initially seeded by a one-time scan at SW startup). For each registry entry with `refetchOnReconnect: true`:

1. Looks up the cached response in the runtime cache by cache key
2. Checks if the entry is stale (past `staleTime`, or if `staleTime` is 0/undefined)
3. If stale → queues a refresh via `queueRefresh(url)` through the shared batch queue

Non-reactive strategies (cache-first, network-first, stale-while-revalidate) do **not** participate in the online recovery scan — their contracts are stateless with respect to staleness. This naturally recovers from: background refresh failure while offline, tab closed while offline, and first request after connectivity returns.

## SSR navigation mode

The `"ssr"` navigation mode is designed for server-rendered applications (Next.js, Remix, Nuxt, SvelteKit, Astro, HTMX). Unlike the old architecture which required separate `navigateFirst` handlers, SSR mode now falls through to the global caching strategy like all other modes. The key differentiator is **auto-prefetch**:

**Auto-prefetch on client-side navigation:** When `"ssr"` mode is enabled, the generated `client-injector` code intercepts `history.pushState()` and `history.replaceState()` and calls `prefetchCache(url)` for each navigation. This ensures that when the user clicks a client-side link (e.g. via a framework router), the SW starts fetching the page in the background before the server responds. The next time the user refreshes or navigates to that page, the cached HTML is available instantly.

The interception is framework-agnostic — every client-side router (Next.js App Router, Remix, React Router, TanStack Router, Vue Router, SvelteKit, Nuxt) ultimately calls `pushState`/`replaceState`. No framework-specific integration is needed.

```js
// Generated automatically when navMode === "ssr"
const origPushState = history.pushState.bind(history);
history.pushState = function (data, unused, url) {
  origPushState(data, unused, url);
  if (typeof url === "string" && url.startsWith("/")) {
    prefetchCache(url);
  }
};
```

All navigation modes (`spa`, `ssr`, `default`) use the same standard strategy dispatch for the actual fetch — the mode only controls whether auto-prefetch is injected in the client.

Non-navigation requests (API calls, assets, RSC payloads) are handled by the configured caching strategy via the normal strategy dispatch system.

## HTML cache isolation

A single URL can serve different content types depending on the request context — full page loads return `text/html` while client-side fetches may return `text/x-component` (RSC), `application/json`, or partial HTML. If these were stored at the same cache key, a hard refresh while offline could serve a non-HTML response to the browser.

Swoff isolates HTML responses in their own cache container (`CACHE_NAME_RUNTIME_HTML = "swoff-runtime-html"`). The `cacheResponse` function routes by Content-Type:

- `text/html` → `CACHE_NAME_RUNTIME_HTML` (HTML-only cache)
- Everything else (RSC, JSON, JS, CSS, images) → `CACHE_NAME_RUNTIME` (main runtime cache)
- If the URL already exists in **precache**, the entry is skipped (never stored in runtime) — precache takes precedence

Cache lookup in `serveFromCache`:

- **Navigation requests** (SSR/Default mode): check `CACHE_NAME_RUNTIME_HTML` first, then precache
- **Non-navigation requests**: check `CACHE_NAME_RUNTIME` first, then precache
- **SPA navigation**: checks precache only for the fallback path (`FALLBACK_PATH`), then returns null

This is framework-agnostic and terminology-agnostic — there is no mention of RSC, dual-payload, or any specific framework. The rule is simply: "HTML is special for navigation; everything else is normal." Any framework that serves different content types at the same URL (Next.js, TanStack Start, HTMX partials, JSON-LD, API formats) is handled automatically.

There is no user-facing config — it is always enabled. Both caches participate in eviction, tag invalidation, activate handler cleanup, and online/focus reactive scans.

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

Both transports are supported via `features.realtime.serverPush.type`.

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
1. Removes matching cache entries from the runtime cache (using a single readwrite transaction against the tag IndexedDB store)
2. Queues each invalidated URL through the shared batch refresh queue (`queueRefresh`) — deduplicated by cache key via a `Map`
3. On successful refetch, sends `CACHE_UPDATED` to all connected clients

---

## Auth: adapter plugin system

Auth is handled through a **adapter plugin system** — a thin port between your auth provider and Swoff. Swoff owns all infrastructure (cache cleanup, event dispatch, 401 handling, SW communication); the adapter reports state for Swoff to react.

### Security: memory-only tokens

Auth tokens are stored **in memory only** — never persisted to IndexedDB or localStorage. Only non-sensitive user data (`{ user, expiresAt }`) is stored in IndexedDB for offline user display.

**Security rationale:**
- A token in IndexedDB/localStorage persists on disk and can be extracted by any script running on the same origin
- A token in memory is cleared on page refresh and cannot be accessed by other tabs
- After page refresh, re-login (or token refresh via adapter's `refresh()`) is required

### Adapter types

| `features.auth.type` | Provider | Adapter behavior |
|---|---|---|
| `"cookie"` | Generic cookie/session auth | No-op headers; browser auto-sends httpOnly cookies |
| `"bearer"` | Generic bearer token | `Authorization: Bearer <token>` header injection |
| `"custom"` | Any custom header | Editable stub — implement `getHeaders()`, `refresh()`, `toAuthData()` |
| `"better-auth"` | Better-Auth | Uses `authClient` from `@/lib/auth-client` |
| `"next-auth"` | Auth.js / NextAuth.js | Uses `useSession` / `getSession` from `next-auth/react` |
| `"clerk"` | Clerk | Uses `useAuth` from `@clerk/nextjs` |
| `"supabase"` | Supabase | Uses `supabase` client from `@/lib/supabase` |

The adapter exposes `type`, `toAuthData()`, `getAuth()`, `subscribe()`, `getHeaders()`, `refresh()`, and `fetchUser()`. The developer owns login/logout; Swoff provides `setAuth()` and `clearAuth()` as a facade. The adapter's `subscribe()` reports `AuthData | null` — Swoff's `useAuth` hook decides when to call `setAuth()`/`clearAuth()`.

### Auth flow

1. User logs in via developer's code → server returns token + user data
2. Developer calls `setAuth(authData)` → stored in memory, persisted to `swoff-auth` IndexedDB, dispatches `sw-auth-state-change`
3. `fetchWithCache(url, { auth: true })` → `getAuth()` → adapter's `getHeaders(headers, auth)` injects auth headers
4. On 401: Swoff calls `clearAuth()` which cascades and broadcasts

### `clearAuth()` cascade

```
clearAuth()
  → null memoryAuth
  → delete "session" from IndexedDB (swoff-auth DB)
  → delete runtime caches by prefix (swoff-runtime*)
  → dispatch sw-auth-state-change event
  → postMessage({ type: "AUTH_CLEARED" }) to SW
    → SW forwards to all clients via clients.matchAll()
      → each client calls clearMemoryAuth()
```

Cache Storage is per-origin — one tab's cache deletion benefits all tabs. Other tabs only null memory (no redundant IDB/cache ops). The SW is a transparent forwarder only — it never inspects, clears, or manages auth data.

### Cross-tab auth sync

- **Initiating tab**: `clearAuth()` sends `AUTH_CLEARED` via `postMessage` to SW
- **SW**: `message-handler.ts` forwards `AUTH_CLEARED` to all clients via `self.clients.matchAll()`
- **Receiving tabs**: `client-injector.ts` handles incoming `AUTH_CLEARED` → calls `clearMemoryAuth()` (nulls memory only) + dispatches `sw-auth-state-change` for UI refresh

### SW build-time auth bypass

Auth endpoints must always reach the server — never cached. At build time, `features.auth.routePaths` is injected into the SW as an `AUTH_ROUTES` constant. The fetch event listener returns early for matching requests, before any strategy resolution, cache lookup, or tag invalidation:

```
fetch event
  → request.url matches AUTH_ROUTES? → return (bypass all caching)
  → normal strategy dispatch
```

This works for all HTTP methods and raw `fetch()` calls — no client-set headers needed.

### Background sync consideration

When the SW syncs queued mutations, cookie auth works transparently (SW sets `credentials: "same-origin"`). Bearer auth does **not** work in the SW (token is memory-only in the page). For bearer auth, call `flushMutations()` after re-login to drain the queue from the client context. The adapter's `type` field (`"cookie"` / `"bearer"`) determines whether background sync is enabled at build time.

### Single IndexedDB database

User data is stored in the same `swoff-auth` database as auth metadata — not a separate `swoff-auth-user` database. `fetchCurrentUser()` is in `auth/store.ts` and uses `persistUserData()` directly. `getAuthState()` reads `auth.user` from `getAuth()`, removing the need for `getCachedUser()` / `cacheUser()` / `clearCachedUser()`.

---

## Strategy resolution flow

Each request is dispatched through the configured strategy using a unified decision tree. All strategies share the same building blocks:

- **`serveFromCache(request)`** — looks up request in precache or runtime caches, with mode-specific rules
- **`_fetchWithTimeout(request)`** — pure fetch with `AbortController` timeout (no cache lookup, no ETag, no 304 handling)
- **`cacheResponse(response, request)`** — stores responses by content-type, skipping runtime when entry exists in precache
- **`fallback(request)`** — returns offline/error page per-route → global → inline 503 (SPA skips global)

### Strategy flow

```
cache-first:
  → serveFromCache (if available)
  → fall back to _fetchWithTimeout on miss → cacheResponse

network-first:
  → _fetchWithTimeout → on failure → serveFromCache

stale-while-revalidate:
  → _fetchWithTimeout (background, non-blocking)
  → serveFromCache (stale allowed — return immediately)
  → on cache miss: wait for network or fallback

cache-only:
  → serveFromCache only (never hits network)

network-only:
  → _fetchWithTimeout only (no cache interaction)

reactive:
  → serveFromCache (if available)
  → shouldReactiveRefresh? → stale (past staleTime)? → queueRefresh(url)
  → also: refetchInterval timer (per-entry setInterval), refetchOnFocus, refetchOnReconnect
    → all trigger refresh through queueRefresh when stale
```

### serveFromCache by mode

```
navigate + SPA:
  → check precache for FALLBACK_PATH → serve if found → null
  → (does NOT check runtime-html — SPA shell comes from precache)

navigate + SSR/default:
  → precache → runtime-html → null
  → followed by fallback() which also checks runtime-html first

non-navigate (any mode):
  → runtime cache → precache → null
```

### Fallback flow (`fallback()`)

```
SSR/Default:
  → runtime-html cache check → per-route fallback → global fallback → inline 503

SPA:
  → per-route fallback → inline 503
  → (no global fallback — already tried FALLBACK_PATH in serveFromCache)
```

### Cache rules

- **`cacheResponse`** always skips storing in runtime when entry exists in precache (precache is authoritative)
- **No SPA guard** in `cacheResponse` — the caller (strategy) decides whether to cache based on mode
- Tags are recorded in IndexedDB for every cache write (runtime or precache)
- `_fetchWithTimeout` is a pure fetch + timeout — all caching decisions happen at the strategy level via `event.waitUntil(cacheResponse(…))`

### Online recovery

```
On "online" event from window:
  → handleOnline() → iterate _reactiveRegistry with refetchOnReconnect
  → for each stale entry → queueRefresh(url) through batch queue
```

### Tag invalidation flow

```
On tag invalidation:
  → open tag DB → find all entries matching tag
  → delete cache entries from runtime cache
  → queueRefresh(url) for each (deduplicated via batch queue)
  → on successful refetch → CACHE_UPDATED to all clients
```

---

## Decision Matrix (Quick Reference)

| Request type           | SPA (nav)                     | SSR / Default (nav)               | Any mode (subresource)          |
| ---------------------- | ----------------------------- | --------------------------------- | ------------------------------- |
| Reactive strategy      | network → fallback (no cache) | cache → network → fallback        | cache (fresh) → network → cache |
| Network‑Only           | network → fallback (no cache) | network → fallback (cache on OK)  | network → cache (on OK)         |
| Network‑First          | network → fallback (no cache) | cache → network → fallback        | cache → network → cache         |
| Cache‑First            | network → fallback (no cache) | cache → network (miss) → fallback | cache → network (miss) → cache  |
| Stale‑While‑Revalidate | network (bg) + fallback       | network (bg) + cache → fallback   | network (bg) + cache → fallback |

> **Legend:**
> - `→ fallback` means if network fails, go to `fallback()`.
> - `(no cache)` means skip `cacheResponse`.
> - `(bg)` = background network fetch.

## Tag introspection

Swoff exposes three introspection functions for debugging and dynamic invalidation:

| Client function | SW handler | Description |
|---|---|---|
| `getUrlsForTag(tag)` → `{ url, actualUrl }[]` | `GET_URLS_FOR_TAG` | Query all URLs cached under a given tag |
| `getTagsForUrl(url)` → `string[]` | `GET_TAGS_FOR_URL` | Query all tags associated with a URL |
| `invalidateMatching(glob)` | `INVALIDATE_MATCHING` | Invalidate all cached entries whose URL matches a glob pattern |

The client functions use `MessageChannel` to communicate with the SW, receiving responses via `channel.port1.onmessage`. The SW handler queries the IndexedDB tag registry (opened via `openTagDB()`) and returns results synchronously through the channel port.

`invalidateMatching` scans all entries in the tag registry, filters by `matchGlob(url, globPattern)`, collects unique tags, and calls `invalidateByTag(tag)` for each matching tag. Invalidated entries are then queue-refreshed through the standard batch queue.

---

## Notifications & Resource Monitoring

Swoff broadcasts resource-level events from the Service Worker to the client window via a unified notification channel. This lets the app react to network failures, storage pressure, and background processing errors without polling.

### Architecture

```
SW scope:
  _fetchWithTimeout() catch     → postMessage(SW_NOTIFICATION, level: "error", code: "FETCH_FAILED")
  precacheAssets()   → postMessage(SW_NOTIFICATION, level: "warn", code: "PRECACHE_FAILED")
  bg sync catch      → postMessage(SW_NOTIFICATION, level: "error", code: "BACKGROUND_SYNC_FAILED")

client-injector.ts:
  message listener   → CustomEvent("swoff:notification", { detail: { level, code, message } })

notification.ts:
  checkStorage()     → navigator.storage.estimate() >= 80% → CustomEvent("swoff:notification")
  getStorageEstimate() → raw estimate without dispatch
```

### Fetch timeout

Every network request made by the SW passes through `_fetchWithTimeout()`, which wraps `fetch()` with an `AbortController` set to `features.serviceWorker.strategy.timeout` seconds (default 10). On timeout or network error:

1. The catch block broadcasts `SW_NOTIFICATION` (`FETCH_FAILED`) to all clients
2. The calling strategy (cache-first, network-first, stale-while-revalidate, reactive) naturally falls through to its cache fallback — no request is lost

This timeout applies uniformly across all strategies, ensuring no single slow request blocks the SW's fetch handler indefinitely.

### Storage quota awareness

`notification.ts` exposes `checkStorage()` and `getStorageEstimate()` — thin wrappers around `navigator.storage.estimate()`. The former dispatches a warning at 80% usage; the latter is a pure utility for rendering quota in the UI (e.g. `useStorageEstimate()` React hook). Formatting is handled by the exported `formatBytes()` helper.

### Why a unified channel?

Rather than one CustomEvent per failure type (`swoff:fetch-failed`, `swoff:precache-failed`, etc.), a single `swoff:notification` event with a `code` discriminator keeps the API surface small and makes it trivial to wire up a toast/notification library:

```ts
window.addEventListener("swoff:notification", (event) => {
  const { level, code, message } = event.detail;
  if (level === "error") myToast.error(message);
  if (level === "warn") myToast.warn(message);
});
```
```
