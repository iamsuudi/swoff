# Request Batching: Swoff's Unique Approach

Request batching coalesces concurrent identical GET requests into a single network fetch. Multiple callers asking for the same URL within a short window receive the same response without duplicating the network request.

This is a feature unique to Swoff — no other caching or SW toolkit implements batching at the fetch level.

## How Swoff does it

Swoff implements a 50ms batching window (configurable via `requestBatchWindowMs` in the config) at the `fetchWithCache` level:

```
t=0ms    Component A calls fetchWithCache("/api/notes")
t=10ms   Component B calls fetchWithCache("/api/notes")
t=20ms   Component C calls fetchWithCache("/api/notes")
t=50ms   → single fetch to /api/notes fires
         → response cloned to A, B, C
```

The mechanism uses two collections:
- **`pendingBatches`** — a `Map<string, { resolvers, rejectors, timer }>` that collects callers within the window.
- **`inFlightRequests`** — a `Map<string, Promise<Response>>` that deduplicates late arrivals after the batch fires.

**Key properties:**

- **Scope:** Any `fetchWithCache` call, not just hooks. Works with `useCachedFetch`, `usePrefetch`, raw `fetchWithCache`, and GraphQL queries.
- **Configurable window:** Default 50ms. Set to 0 to disable.
- **In-flight dedup:** If a request to the same URL is already in flight (from a previous batch), new callers await the same promise instead of creating a new fetch.
- **Automatic cleanup:** AbortController signals remove entries from `inFlightRequests` on cancellation.
- **Thread:** SW thread. The batching logic runs in the SW `fetch` handler, so batched requests also benefit from SW caching strategies.

## No competitor implements this

| Library | Request batching | Dedup mechanism |
|---|---|---|
| **Swoff** | ✅ 50ms batch window + in-flight Map | SW-level, coalesces concurrent GETs before network |
| **TanStack Query** | ❌ | Per query-key dedup (after fetch starts) |
| **SWR** | ❌ | Per-key dedup (after fetch starts) |
| **Workbox** | ❌ | Network request dedup only |
| **Apollo Client** | ❌ | Per-operation dedup (GraphQL level) |
| **Next.js** | ❌ | No fetch-level batching |
| **TanStack Router** | ❌ | No fetch-level batching |

The key difference: TanStack Query and SWR deduplicate *after* initiating the fetch by tracking in-flight promises by key. If two components mount simultaneously and call `useQuery(["notes"])`, the second one sees the in-flight promise and waits. This is useful but doesn't reduce network requests — the first call already fired.

Swoff's batch window catches all callers *before* the network request fires. If 15 route components each validate their data with `fetchWithCache("/api/auth/me")` on mount, only one network request fires within the 50ms window. The 14 others receive a cloned response.

## When it matters

| Scenario | Without batching | With Swoff batching |
|---|---|---|
| 15 components mount simultaneously, each fetching `/api/config` | 15 requests (or 15 cache lookups) | 1 request + 14 clone() |
| Rapid route transition prefetches same URL | 2-3 requests during hover + click | 1 request, others get cloned response |
| Multiple `useCachedFetch` instances for same URL on a page | N concurrent fetches | 1 fetch + N-1 clones |
| GraphQL query dedup when two hooks fire same POST | 2 network requests | 1 request (body-hash dedup + batch) |

The savings are most visible on cold cache (first page load) or when many components independently request the same resource on mount.
