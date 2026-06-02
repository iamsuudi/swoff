# Generated Files API Reference

Complete API documentation for every generated file in `swoff/`. Files are
generated based on `swoff.config.json` — see [CLI.md](./CLI.md#generate) for
generation commands and [CONFIG.md](./CONFIG.md) for the full config schema.

---

## `fetch-wrapper.ts`

Unified fetch with caching, auth, offline queue, auto-invalidation, staleTime, prefetching, and
per-request strategy override. This is the core networking primitive — use it for all API calls.

```ts
import { fetchWithCache, prefetchCache } from "swoff/fetch-wrapper";
```

### `fetchWithCache<T>(input, options?)`

| Param     | Type                    | Description                  |
| --------- | ----------------------- | ---------------------------- |
| `input`   | `RequestInfo`           | URL string or Request object |
| `options` | `FetchWithCacheOptions` | See below                    |

**Returns:** `Promise<{ response: Response & { json(): Promise<T> }, fromCache: boolean }>`

- `response`: the fetch Response (from cache or network). Typed `json()` in TS.
- `fromCache`: `true` when served from SW cache

### Options

All `RequestInit` fields are supported (`method`, `body`, `headers`, `credentials`, `signal`, etc.) plus:

| Option                 | Type                                                                                             | Default                 | Description                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------- |
| `tags`                 | `string[]`                                                                                       | auto-generated from URL | Cache invalidation tags for this request                 |
| `auth`                 | `boolean`                                                                                        | `false`                 | Attach auth token via `withAuthHeaders()`                |
| `queueOffline`         | `boolean`                                                                                        | `true`                  | When offline, queue writes to IndexedDB                  |
| `invalidate`           | `'auto' \| string[] \| false`                                                                    | `'auto'`                | Auto-invalidate cache tags after successful mutation     |
| `type`                 | `'read' \| 'mutation'`                                                                           | auto-detected           | Override read/mutation detection                         |
| `strategy`             | `'cache-first' \| 'network-first' \| 'stale-while-revalidate' \| 'cache-only' \| 'network-only' \| 'reactive'` | —                       | Override caching strategy per-request (highest priority) |
| `staleTime`            | `number`                                                                                         | —                       | Override stale time in seconds (reactive-only, per-request tier 1) |
| `validateSuccess`      | `(response: Response) => boolean \| Promise<boolean>`                                            | `res.ok`                | Custom mutation success check (e.g. when API returns 200 with `{ success: false }`) |
| `invalidateUrl`        | `string`                                                                                         | the request URL         | Override the URL used for auto-invalidation tags. Useful when mutation URL differs from cache tag URL. |
| `signal`               | `AbortSignal`                                                                                    | —                       | AbortController signal for cancellation                  |

### Behavior

- **Read vs mutation**: GET/HEAD → read (cached). POST/PUT/DELETE/PATCH → mutation (pass through).
  Override with `type: 'read'` or `type: 'mutation'`.
- **Offline reads**: returns cached response if available; throws if not cached.
  **Abort check**: if `signal.aborted`, throws `AbortError` before cache lookup.
- **Offline writes**: queues to IndexedDB (when `mutationQueue` enabled). Replays on `online` event.
  Disable per-request with `queueOffline: false`.
- **Request batching + dedup**: concurrent GETs to the same URL within a 50 ms window coalesce into one network request. After the batch window closes, in-flight requests are deduplicated (late arrivals piggyback on the active promise). Each caller receives a cloned response. AbortController integration: cleaned up on completion or abort.
- **Auto-tags**: when `tagInvalidation` enabled, tags derived from URL path for read requests.
- **Auto-invalidate**: after a successful mutation, matching cache tags are invalidated. Mutation success is determined by `response.ok` by default, or `validateSuccess` if provided. The auto-invalidation target URL can be overridden with `invalidateUrl` (useful when mutation URL differs from the cache tag URL).
- **Auth**: when `auth: true`, attaches auth headers. Dispatches `sw-auth-unauthorized` on 401.
- **StaleTime**: 3-tier resolution (per-request / route pattern / global default). Only affects `reactive` strategy. Controls the fresh window before a background refresh is triggered.
- **Background refresh retry**: failed refetches are retried with exponential backoff up to `features.refetchQueue.maxRetries` times (base delay `features.refetchQueue.retryDelayMs`).

### `prefetchCache(input, options?)`

Fire-and-forget prefetch to warm the cache. Silently swallows errors.

```ts
prefetchCache("/api/todos");
prefetchCache("/api/todos");
```

---

## `mutation-queue.ts`

Offline write queue backed by IndexedDB. Writes performed while offline are stored and replayed
automatically when the connection returns.

```ts
import {
  queueMutation,
  processMutationQueue,
  flushMutations,
  getPendingCount,
  getQueuePosition,
  getQueueItems,
} from "swoff/mutation-queue";
```

### Functions

| Function               | Signature                                              | Description                                                                                                                           |
| ---------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `queueMutation`        | `(mutation: MutationQueueItem) => Promise<void>`       | Store a write for later sync                                                                                                          |
| `processMutationQueue` | `() => Promise<{ succeeded: number, failed: number }>` | Replay all queued writes. Respects `batchSize`, `batchDelayMs`, `maxRetries`, `retryBackoffMs`. Runs automatically on `online` event. |
| `flushMutations`       | `() => Promise<void>`                                  | Same as `processMutationQueue`. Call after re-login (queued mutations may have stale auth).                                           |
| `getPendingCount`      | `() => Promise<number>`                                | Number of mutations waiting to sync                                                                                                   |
| `getQueuePosition`     | `(id: string) => Promise<number>`                      | 0-based position of a mutation in the queue. Returns -1 if not found.                                                                 |
| `getQueueItems`        | `() => Promise<MutationQueueItem[]>`                   | All pending queue items with their status, retry count, and metadata                                                                  |

### `MutationQueueItem`

```ts
{
  id: string;
  method: string;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  tags?: string[];
  timestamp: number;
  retryCount: number;
  status?: "pending" | "processing" | "failed";
}
```

Generated when `features.mutationQueue.enabled` is `true`.

---

## `mutation-state.ts`

Per-mutation state tracking. Each mutation operation gets an ID that can be used to track its
status (loading, success, error) across the app.

```ts
import {
  startMutation,
  trackMutation,
  getMutationState,
  clearMutationState,
  onMutationStateChange,
} from "swoff/mutation-state";
```

### Functions

| Function                | Signature                                                                       | Description                                                               |
| ----------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `startMutation`         | `(id?: string) => string`                                                       | Create a new mutation with `"loading"` status. Returns the mutation ID.   |
| `trackMutation`         | `(id: string, status: MutationStatus, data?: unknown, error?: unknown) => void` | Update a mutation's status. Dispatches a state change event.              |
| `getMutationState`      | `(id: string) => MutationState \| undefined`                                    | Get the current state of a mutation                                       |
| `clearMutationState`    | `(id: string) => void`                                                          | Remove a mutation from tracking                                           |
| `onMutationStateChange` | `(cb: (state: MutationState) => void) => () => void`                            | Subscribe to all mutation state changes. Returns an unsubscribe function. |

### Use with `useMutation`

The `useMutation` React hook wraps `startMutation` + `trackMutation` and exposes
`{ mutate, isLoading, isError, isSuccess, data, error, reset }`.

---

## `server-push.ts`

Client-side connection manager for real-time cache invalidation via SSE or WebSocket.
The service worker maintains the primary connection; this module provides a fallback and
status events for the UI.

```ts
import {
  startPushEvents,
  stopPushEvents,
  isPushConnected,
} from "swoff/server-push";
```

### Functions

| Function            | Description                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startPushEvents()` | Connect to the push endpoint and begin listening for invalidation events. Auto-reconnects on connection loss with exponential backoff (initial delay from config, capped at 30s). |
| `stopPushEvents()`  | Disconnect from the push endpoint                                                                                                                                                 |
| `isPushConnected()` | Returns `boolean` — whether the connection is currently active                                                                                                                    |

### Events

The module dispatches:

- `push-events-status` — `CustomEvent<{ connected: boolean }>` — connection status changes
- `cache-invalidated` — `CustomEvent<{ tags: string[] }>` — when the server sends an invalidation

### Server format

**SSE** (default):

```
event: invalidate
data: {"tags": ["todos", "categories"]}

```

**WebSocket:**

```json
{ "event": "invalidate", "tags": ["todos", "categories"] }
```

Generated when `features.serverPush.enabled` is `true`.

---

## `cache.ts`

Low-level cache invalidation. Sends invalidation messages to the SW; the SW
removes matching entries from the runtime cache and confirms back to the
client-injector, which dispatches `cache-invalidated` on the window.

```ts
import { invalidateByTag, invalidateByTags } from "swoff/cache";
```

### Functions

| Function           | Signature                           | Description                                                                               |
| ------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `invalidateByTag`  | `(tag: string) => Promise<void>`    | Send `INVALIDATE_TAG` to the SW; the SW removes matching cache entries and confirms via `TAG_INVALIDATED` (client-injector dispatches `cache-invalidated` on the window). |
| `invalidateByTags` | `(tags: string[]) => Promise<void>` | Invalidate multiple tags at once. Cascading is expanded by callers before calling this function. |

Generated when `features.tagInvalidation` is `true`.

---

## `invalidation-tags.ts`

Tag generation helpers. Tags are derived from URL paths and used to mark cache entries
for targeted invalidation after mutations.

```ts
import {
  generateTags,
  generateTagsFromMethod,
  invalidateUrl,
  invalidateByMethod,
  expandCascading,
  getUrlsForTag,
  getTagsForUrl,
  invalidateMatching,
} from "swoff/invalidation-tags";
```

### Functions

| Function                 | Signature                                        | Description                                                          |
| ------------------------ | ------------------------------------------------ | -------------------------------------------------------------------- |
| `generateTags`           | `(url: string) => string[]`                      | Extract tags from URL path. `/api/todos/42` → `["todos", "todo:42"]` |
| `generateTagsFromMethod` | `(method: string, url: string) => string[]`      | Method-prefixed tags. `POST /api/todos` → `["post-todos"]`           |
| `invalidateUrl`          | `(url: string) => Promise<void>`                 | Extract tags from URL and invalidate all matching cache entries      |
| `invalidateByMethod`     | `(method: string, url: string) => Promise<void>` | Invalidate using method-prefixed tags                                |
| `expandCascading`        | `(tags: string[]) => string[]`                   | Expand tags with cascading dependencies, deduplicated                |
| `getUrlsForTag`          | `(tag: string) => Promise<{ url, actualUrl }[]>` | Get all URLs cached under a given tag (uses MessageChannel)          |
| `getTagsForUrl`          | `(url: string) => Promise<string[]>`             | Get all tags associated with a given URL                             |
| `invalidateMatching`     | `(glob: string) => Promise<void>`                | Invalidate all cached responses whose URL matches a glob pattern     |

Generated when `features.tagInvalidation` is `true`.

---

## `gql-wrapper.ts`

GraphQL wrapper with body-hash caching. Brings Swoff's caching, auth, offline queue, and
tag-based invalidation to GraphQL APIs.

```ts
import { fetchWithGql, queryGql, mutateGql } from "swoff/gql-wrapper";
```

### Functions

| Function          | Signature                                                                                                                | Description                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `fetchWithGql<T>` | `(query: string, options?: GqlOptions) => Promise<{ data: T, fromCache: boolean }>`                                      | Core function. Hashes query + variables, sets `X-SW-Cache-Key`, delegates to `fetchWithCache`. |
| `queryGql<T>`     | `(query: string, variables?: Record<string, unknown>, options?: GqlOptions) => Promise<{ data: T, fromCache: boolean }>` | Shorthand for reads — sets `type: "read"`                                                      |
| `mutateGql<T>`    | `(mutation: string, variables?: Record<string, unknown>, options?: GqlOptions) => Promise<{ data: T }>`                  | Shorthand for writes — sets `type: "mutation"`, auto-invalidates related tags                  |

### How it works

1. **Body hashing**: `query` + `variables` are JSON-stringified and SHA-256 hashed via `crypto.subtle.digest()`. First 16 hex chars become `X-SW-Cache-Key: gql:<hash>`.
2. **Virtual cache URL**: The SW treats the hash as the cache key instead of the actual URL. Different queries to the same endpoint don't collide.
3. **Auto-tags**: Operation names like `getTodos` → `["todos"]`; `createTodo` → `["todos", "todo"]`.
4. **Offline queue**: Mutations queue in IndexedDB; reads return cached data.

### `GqlOptions`

All `fetchWithCache` options are available, plus:

| Option                 | Type                          | Default        | Description                                      |
| ---------------------- | ----------------------------- | -------------- | ------------------------------------------------ |
| `variables`            | `Record<string, unknown>`     | `undefined`    | GraphQL variables                                |
| `tags`                 | `string[]`                    | auto-generated | Override invalidation tags                       |
| `auth`                 | `boolean`                     | `false`        | Attach auth token                                |
| `queueOffline`         | `boolean`                     | `true`         | Queue mutations when offline                     |
| `invalidate`           | `'auto' \| string[] \| false` | `'auto'`       | Auto-invalidate after mutation                   |

Generated when `features.graphql.enabled` is `true`.

---

## Auth module

Generated when `features.auth.enabled` is `true`. Three files in `swoff/auth/`.

### `auth/store.ts`

Token and user persistence. Token is memory-only (never persisted to disk).

```ts
import {
  setAuth,
  getAuth,
  clearAuth,
  isAuthValid,
  createAuthFromResponse,
  ensureValidAuth,
  withAuthHeaders,
} from "swoff/auth/store";
```

| Function                           | Returns                     | Description                                                  |
| ---------------------------------- | --------------------------- | ------------------------------------------------------------ |
| `setAuth(authData)`                | `Promise<void>`             | Store auth in memory, persist user to IndexedDB              |
| `getAuth()`                        | `Promise<AuthData \| null>` | Get auth from memory (IndexedDB fallback after page refresh) |
| `clearAuth()`                      | `Promise<void>`             | Clear memory + IndexedDB. Call on logout/401.                |
| `isAuthValid(auth)`                | `boolean`                   | Check existence + `expiresAt` expiry                         |
| `createAuthFromResponse(response)` | `AuthData`                  | **Edit this** to match your backend's login response shape   |
| `ensureValidAuth()`                | `Promise<AuthData \| null>` | Check expiry, refresh via `refreshPath` if needed            |
| `withAuthHeaders(headers, auth)`   | `void`                      | Inject auth headers (bearer, cookie, or custom)              |

### `auth/user.ts`

User data caching for offline display.

```ts
import {
  fetchCurrentUser,
  getCachedUser,
  cacheUser,
  clearCachedUser,
} from "swoff/auth/user";
```

| Function             | Description                                      |
| -------------------- | ------------------------------------------------ |
| `fetchCurrentUser()` | Fetch from `userEndpoint` and cache in IndexedDB |
| `getCachedUser()`    | Load user from IndexedDB (available offline)     |
| `cacheUser(user)`    | Manually persist user data                       |
| `clearCachedUser()`  | Remove user from cache                           |

### `auth/state.ts`

Detects which of 4 states the app is in.

```ts
import { getAuthState } from "swoff/auth/state";
```

| Function         | Returns                                                                                       | Description                                                                |
| ---------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `getAuthState()` | `Promise<{ authenticated: boolean, user: Record<string, unknown> \| null, online: boolean }>` | Detect state: online+auth, online+unauthed, offline+auth, offline+unauthed |

---

## `pwa/install.ts`

Install prompt handling and manifest generation.

```ts
import {
  setupPwaInstall,
  isInstallable,
  promptInstall,
} from "swoff/pwa/install";
```

| Function            | Description                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `setupPwaInstall()` | Listen for `beforeinstallprompt` / `appinstalled` events. Called automatically by `client-injector.ts`. |
| `isInstallable()`   | Check if install prompt is available (returns `boolean`)                                                |
| `promptInstall()`   | Show the native install prompt. Returns `{ outcome: string }`.                                          |

Generated when `features.pwa.enabled` is `true`.

---

## `push.ts`

Push notification subscription management with IndexedDB persistence.

```ts
import {
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  getPushSubscription,
  requestNotificationPermission,
} from "swoff/push";
```

| Function                          | Description                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `subscribeToPush()` | Request permission and subscribe. Returns `PushSubscription \| null` (null if denied). |
| `unsubscribeFromPush()`           | Unsubscribe and clear stored subscription                                              |
| `isSubscribed()`                  | Check subscription status (returns `Promise<boolean>`)                                 |
| `getPushSubscription()`           | Get current subscription object (returns `Promise<PushSubscription \| null>`)          |
| `requestNotificationPermission()` | Request permission only. Returns `Promise<boolean>`.                                   |

Generated when `features.pushNotifications.enabled` is `true`.

---

## `background-sync.ts`

Background Sync API registration for processing mutations even after tab close.

```ts
import { syncWhenPossible, retrySync } from "swoff/background-sync";
```

| Function                     | Description                                                            |
| ---------------------------- | ---------------------------------------------------------------------- |
| `syncWhenPossible(mutation)` | Queue and register a background sync event                             |
| `retrySync()`                | Re-register sync if mutations are still pending (called automatically) |

Fallback: uses the `online` event listener in unsupported browsers (Firefox, Safari).
Generated when `features.backgroundSync` is `true`.

---

## `reset.ts`

Nuclear reset for the entire Swoff system. Clears all caches, IndexedDB databases, localStorage,
unregisters service workers, and re-registers via `initServiceWorker`.

```ts
import { resetSwoff } from "swoff/reset";
```

### `resetSwoff(options?)`

```ts
await resetSwoff({ clearStorage: true, reRegister: true });
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `clearStorage` | `boolean` | `true` | When true, clears all caches, IndexedDB (`swoff-*` databases), and localStorage |
| `reRegister` | `boolean` | `true` | When true, re-registers the service worker after cleanup |

Always generated.

---

## `fetch-state.ts`

Global fetch activity state tracking. Reports the total number of in-flight fetch requests
via a counter and custom events.

```ts
import {
  incrementFetchCount,
  decrementFetchCount,
  getFetchCount,
} from "swoff/fetch-state";
```

| Function | Returns | Description |
|----------|---------|-------------|
| `incrementFetchCount()` | `void` | Increments global counter and dispatches `fetch-count-changed` |
| `decrementFetchCount()` | `void` | Decrements global counter and dispatches `fetch-count-changed` |
| `getFetchCount()` | `number` | Returns current in-flight fetch count |

The `fetch-wrapper.ts` calls `incrementFetchCount()` before each request and
`decrementFetchCount()` after each response, so the counter automatically tracks
all active requests.

Always generated.

---

## React hooks

Generated when `features.framework` is `"react"`. All hooks live in `swoff/hooks/`.

### `useCachedFetch<T>(url, options?)`

```ts
const { data, error, loading, refetch } = useCachedFetch<Todo[]>("/api/todos");
const { data: posts } = useCachedFetch<Post[]>("/api/posts", {
  enabled: !!user,
});
```

Returns `{ data: T \| null, error: unknown, loading: boolean, refetch: () => void }`.

- Auto-refetches on `cache-invalidated` events matching the URL
- **Dependent queries**: pass `enabled: false` or a nullable URL to skip until a condition is met
- Stale data is automatically refreshed in the background by the SW (batched & rate-limited) when using the `reactive` strategy. On `online` event, reactive entries with `refetchOnReconnect` are recovered.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `select` | `(data: T) => TSelected` | identity | Transform the response data. Uses `useRef` to skip re-renders when the selected value is equal (`Object.is`) to the previous one. |
| `keepPreviousData` | `boolean` | `false` | When `true`, keeps the previous successful data during a background refetch instead of showing a loading state. The returned `data` is stable — it only updates when the new fetch completes. |
| `placeholderData` | `T \| null` | `null` | Initial data to show while the first fetch is in-flight. Useful for skeleton UI. |
| `onSuccess` | `(data: T) => void` | — | Callback fired when a fetch succeeds. Runs at the hook level (every successful fetch). |
| `onError` | `(err: unknown) => void` | — | Callback fired when a fetch fails. Runs at the hook level (every failed fetch). |
| `enabled` | `boolean` | `true` | When `false`, the fetch is skipped entirely. Useful for dependent queries. |

### `useMutation(url, options?)` / `useMutation(options?)`

Two overloaded signatures:

- **`useMutation<TData>(url, options?)`** — URL fixed at hook level. `mutate(body?, callbacks?)`.
  Use for a single endpoint with one configuration.
- **`useMutation<TData>(options?)`** — URL passed per call. `mutate(url, fetchOptions?, callbacks?)`.
  Use when the endpoint varies (e.g., delete-by-id in a list).

#### Signature 1 — URL at hook level

```ts
const { mutate, isLoading, data } = useMutation<{ id: number }>("/api/notes", {
  method: "POST",
  auth: true,
  headers: { "Content-Type": "application/json" },
  onSuccess: (note) => console.log("created", note.id),  // fully typed
});
await mutate(JSON.stringify({ title, description }), {
  onSuccess: (note) => console.log("per-call", note.id),
});
```

Hook-level `fetchOptions` (`method`, `auth`, `headers`, etc.) are used as config.
Per-call `mutate(body?, callbacks?)` only varies the request body — method/auth/headers
cannot be overridden, keeping state (data, isLoading, error) bound 1:1 to this endpoint.

#### Signature 2 — URL per call

```ts
const { mutate, isLoading } = useMutation({
  onMutate: () => setOptimisticState(),
});
await mutate(`/api/notes/${id}`, { method: "DELETE", auth: true }, {
  onSuccess: () => invalidateTags(["notes"]),
});
```

Per-call `fetchOptions` are merged over hook-level options (per-call wins on conflict).

#### Hook-level options (`UseMutationOptions<TData>`)

All fields from `FetchWithCacheOptions` plus:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onSuccess` | `(data: TData) => void` | — | Hook-level success callback. Runs for every successful mutation. |
| `onError` | `(error: Error) => void` | — | Hook-level error callback. Runs for every failed mutation. |
| `onSettled` | `() => void` | — | Hook-level settled callback. Runs after success or error. |
| `onMutate` | `() => void` | — | Called before the mutation fires. Use for optimistic updates. |
| `mutationKey` | `string` | — | Deduplication key. Skips if a mutation with the same key is in-flight. |
| `retry` | `number \| boolean` | `0` | Retry count on failure. `true` = Infinity. 1s backoff between retries. |

Full `FetchWithCacheOptions` accepted: `method`, `auth`, `headers`, `body`, `tags`,
`invalidate`, `queueOffline`, `strategy`, `signal`, `staleTime`, `validateSuccess`, etc.

#### Per-call arguments

**Signature 1** — `mutate(body?, callbacks?)`:

| Arg | Type | Description |
|-----|------|-------------|
| `body` | `BodyInit \| null` | Request body. Overrides hook-level `body`. |
| `callbacks.onSuccess` | `(data: TData) => void` | Per-call success. Fires **after** hook-level. |
| `callbacks.onError` | `(error: Error) => void` | Per-call error. Fires **after** hook-level. |
| `callbacks.onSettled` | `() => void` | Per-call settled. Fires **after** hook-level. |
| `callbacks.mutationKey` | `string` | Overrides hook-level `mutationKey`. |
| `callbacks.retry` | `number \| boolean` | Overrides hook-level `retry`. |

**Signature 2** — `mutate(url, fetchOptions?, callbacks?)`:

| Arg | Type | Description |
|-----|------|-------------|
| `url` | `string` | Endpoint URL. |
| `fetchOptions` | `MutateOptions` | Per-call fetch options. Merged over hook-level. |
| `callbacks.onSuccess` | `(data: TData) => void` | Per-call success. Fires **after** hook-level. |
| `callbacks.onError` | `(error: Error) => void` | Per-call error. Fires **after** hook-level. |
| `callbacks.onSettled` | `() => void` | Per-call settled. Fires **after** hook-level. |
| `callbacks.mutationKey` | `string` | Overrides `fetchOptions.mutationKey`. |
| `callbacks.retry` | `number \| boolean` | Overrides `fetchOptions.retry`. |

#### Callback order

`onMutate` (hook) → fetch → `onSuccess`/`onError` (hook) → `onSuccess`/`onError` (per-call)
→ `onSettled` (hook) → `onSettled` (per-call)

#### Precedence

| Field | Resolution order |
|-------|-----------------|
| `mutationKey` | callbacks > fetchOptions (Sig 2) > hook-level |
| `retry` | callbacks > fetchOptions (Sig 2) > hook-level |
| `method`, `auth`, `headers`, `body`, etc. | fetchOptions (Sig 2) > hook-level; fixed in Sig 1 |

### `usePrefetch()`

```ts
const prefetch = usePrefetch();
<a onMouseEnter={() => prefetch("/api/todos")}>Todos</a>
```

Returns a stable `prefetch(input, options?)` callback. Internally tracks a `prefetchList`
(string array of prefetched URLs) which is accessible for debugging. Call `clear()` to
reset the list.

### `useIsFetching()`

```ts
const isFetching = useIsFetching();
```

Returns `boolean` — `true` when any request tracked by `fetch-state.ts` is in-flight.
Listens to `fetch-count-changed` custom events.

### `useSwoffReset()`

```ts
const { reset, isResetting, error } = useSwoffReset();
```

| Field | Type | Description |
|-------|------|-------------|
| `reset` | `(options?) => Promise<void>` | Calls `resetSwoff()` with optional `{ clearStorage, reRegister }` |
| `isResetting` | `boolean` | `true` while the reset is in progress |
| `error` | `unknown` | Last error from a failed reset attempt, or `null` |

### `useMutationState(id)`

```ts
const mutation = useMutationState(mutationId);
if (mutation?.status === "error") {
  /* show error */
}
```

Returns `MutationState | null`. Subscribes to a specific mutation's state changes.
Pass `null` or empty string to disable.

### `useMutationQueue()`

```ts
const { pending, items, lastSync, isProcessing, retryAll } = useMutationQueue();
```

| Field | Type | Description |
|-------|------|-------------|
| `pending` | `number` | Count of mutations waiting to sync |
| `items` | `MutationQueueItem[]` | All pending items with status, retry count, URL, method |
| `lastSync` | `{ succeeded: number, failed: number } \| null` | Result of the last sync attempt |
| `isProcessing` | `boolean` | `true` while the mutation queue is actively processing items (derived from `mutation-sync-complete` custom event) |
| `retryAll` | `() => Promise<void>` | Manually trigger a full replay of all queued mutations |

### `useNetworkStatus()`

```ts
const { online, wasOffline, lastChangedAt, effectiveType, downlink } = useNetworkStatus();
```

| Field | Type | Description |
|-------|------|-------------|
| `online` | `boolean` | Current online status |
| `wasOffline` | `boolean` | `true` if the browser was offline at any point since the hook mounted |
| `lastChangedAt` | `Date \| null` | Timestamp of the last online/offline transition |
| `effectiveType` | `string` | Network effective type (`"slow-2g"`, `"2g"`, `"3g"`, `"4g"`) from `navigator.connection` |
| `downlink` | `number` | Estimated downlink speed in Mb/s from `navigator.connection` |

### `useAuth()`

```ts
const { authenticated, user, online, isLoading, error, setAuth, clearAuth, ensureValid } = useAuth();
```

| Field | Type | Description |
|-------|------|-------------|
| `authenticated` | `boolean` | Whether the user is authenticated |
| `user` | `Record<string, unknown> \| null` | Current user data (from IndexedDB cache) |
| `online` | `boolean` | Current online status |
| `isLoading` | `boolean` | `true` while checking auth state on mount |
| `error` | `unknown` | Last auth error, or `null` |
| `setAuth` | `(data: AuthData) => Promise<void>` | Manually set auth data |
| `clearAuth` | `() => Promise<void>` | Clear auth data (logout) |
| `ensureValid` | `() => Promise<boolean>` | Check auth validity and refresh if needed. Returns `true` if valid. |

### `useSWUpdate()`

```ts
const {
  updateStatus,
  currentVersion,
  availableVersion,
  forceUpdate,
  error,
  acceptUpdate,
  dismissUpdate,
} = useSWUpdate();
```

`updateStatus` is one of: `"idle"`, `"available"`, `"downloading"`, `"ready"`.

### `useSWProgress()`

```ts
const { status, progress } = useSWProgress();
```

`progress` = `{ percent: number, downloaded: number, total: number }` during SW download.

### `usePushSubscription()`

```ts
const {
  subscribed,
  subscription,
  permission,
  loading,
  subscribe,
  unsubscribe,
} = usePushSubscription();
```

Generated when `pushNotifications.enabled`.

### `useBackgroundSync()`

```ts
const { supported, registered, lastSync, triggerSync } = useBackgroundSync();
```

Generated when `backgroundSync` is `true`.

### `useCacheInvalidation()`

```ts
const { invalidateByTag, invalidateByTags, invalidateUrl } =
  useCacheInvalidation();
```

Stable `useCallback`-wrapped versions of cache invalidation functions.
Generated when `tagInvalidation` is `true`.
