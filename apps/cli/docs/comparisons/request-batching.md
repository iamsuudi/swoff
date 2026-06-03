# Request Batching: Swoff's Unique Approach

Request batching coalesces concurrent identical GET requests into a single network fetch. Multiple callers asking for the same URL within a short window receive the same response without duplicating the network request. This feature is unique to Swoff — no other caching or SW toolkit implements it at the fetch level.

## How Swoff does it

Swoff implements a configurable batching window (default 50ms, `requestBatchWindowMs` in config) in the generated `fetchWithCache` function:

```
t=0ms    Component A calls fetchWithCache("/api/notes")
t=10ms   Component B calls fetchWithCache("/api/notes")
t=20ms   Component C calls fetchWithCache("/api/notes")
t=50ms   → single fetch to /api/notes fires
         → response cloned to A, B, C
```

Two collections manage this:
- **`pendingBatches`** — a `Map` collecting callers within the window, each with their own resolver/rejector.
- **`inFlightRequests`** — a `Map` deduplicating late arrivals after the batch fires.

**Key properties:**
- **Scope:** Any `fetchWithCache` call — hooks, raw calls, GraphQL queries.
- **Configurable window:** Default 50ms. Set to 0 to disable.
- **In-flight dedup:** A request already in flight (from a previous batch) is reused by new callers via promise cloning.
- **Automatic cleanup:** AbortController signals remove entries from `inFlightRequests` on cancellation.
- **Thread:** Main thread. The batching runs in `fetchWithCache` before the request reaches the SW. The single batched `fetch()` is then intercepted by the SW and benefits from caching strategies.

## No competitor implements this

| Library | Request batching | Dedup mechanism |
|---|---|---|
| **Swoff** | ✅ 50ms batch window + in-flight Map | Coalesces concurrent GETs *before* the network request |
| **TanStack Query** | ❌ | Per query-key dedup *after* fetch starts |
| **SWR** | ❌ | Per-key dedup *after* fetch starts |
| **Workbox** | ❌ | Network request dedup only |
| **Apollo Client** | ❌ | Per-operation dedup (GraphQL level) |
| **Next.js** | ❌ | No fetch-level batching |
| **TanStack Router** | ❌ | No fetch-level batching |

The key difference: TanStack Query and SWR deduplicate *after* initiating the fetch by tracking in-flight promises by key. If two components mount simultaneously and call `useQuery(["notes"])`, the second one sees the in-flight promise and waits — useful but doesn't reduce network requests. Swoff's batch window catches all callers *before* the network request fires.

## When it matters

| Scenario | Without batching | With Swoff batching |
|---|---|---|
| 15 components mount simultaneously fetching `/api/config` | 15 requests | 1 request + 14 `clone()` |
| Rapid route transition prefetches same URL | 2–3 requests during hover + click | 1 request |
| Multiple `useCachedFetch` instances for same URL | N concurrent fetches | 1 fetch + N−1 clones |
| GraphQL POST dedup (body-hash + batch) | 2 network requests | 1 request |

The savings are most visible on cold cache (first page load) or when many components independently request the same resource on mount.
