# GraphQL: Swoff vs Apollo Client / Relay

GraphQL caching splits between **body-hash URL caching** (Swoff) and **normalized in-memory caches** (Apollo, Relay). These are fundamentally different primitives: one treats GraphQL as HTTP requests with POST bodies, the other splits responses into entity graphs.

## How Swoff does it

Swoff treats GraphQL queries and mutations as HTTP requests. The cache key is a deterministic SHA-256 hash of the request URL + body:

```
const cacheKey = await bodyHash({ query: LIST_QUERY, variables });
// → "a1b2c3d4e5f6g7h8"
// SW caches by this key in the Cache Storage API
```

**Key properties:**
- **Storage:** Cache Storage API (disk-backed, survives reloads and SW restarts).
- **Cache key:** SHA-256 hash of the full request body (query + variables). Deterministic — same query + same variables = same cache entry regardless of variable ordering.
- **Tags:** Auto-derived from the GraphQL operation name. `query GetNotes` generates tag `"GetNotes"`. Mutations auto-invalidate the matching tag.
- **Offline:** Native. Cached GraphQL responses are served from the SW cache.
- **No normalized merging:** Each query result is cached as a complete response. Overlapping data across queries is stored independently.

```tsx
const { data } = await queryGql<{ notes: Note[] }>(
  `query GetNotes { notes { id title } }`,
  undefined,
  { auth: true }
);

const { data } = await mutateGql<{ deleteNote: boolean }>(
  `mutation DeleteNote($id: Int!) { deleteNote(id: $id) }`,
  { id: 1 },
  { auth: true }
);
// Auto-invalidates "DeleteNote", cascading dependencies refetch "GetNotes"
```

## How Apollo Client does it

Apollo Client uses a **normalized in-memory cache**. Every response is split into individual entities (identified by `__typename` + `id`), stored in a flat `Map`, and reassembled on read:

```
// Response: { notes: [{ __typename: "Note", id: 1, title: "Hello" }] }
// Stored as: cache["Note:1"] = { __typename: "Note", id: 1, title: "Hello" }
// Query reads: cache.readFragment({ id: "Note:1", fragment: gql`...` })
```

**Key properties:**
- **Storage:** In-memory `InMemoryCache` (wiped on tab close, survives via optional `persistCache` to IDB).
- **Cache key:** `__typename` + `id` (or custom `keyFields`). Entity-based, not request-based.
- **Tags:** No built-in tag system. Custom `afterware` or manual cache eviction.
- **Offline:** Requires `persistCache` adapter. No SW integration.
- **Normalized merging:** A mutation updating one entity automatically updates every query referencing it.

## Comparison table

| Feature | Swoff | Apollo Client | Relay |
|---|---|---|---|
| **Cache model** | Body-hash URL cache | Normalized entity cache | Normalized entity cache (compiler-optimized) |
| **Storage** | Cache Storage API (disk) | In-memory (+ optional IDB persist) | In-memory (+ optional persist) |
| **Survives hard nav?** | ✅ Yes | ❌ No (unless persisted) | ❌ No (unless persisted) |
| **Works offline?** | ✅ Yes (native) | 🟡 With persistCache + manual SW | 🟡 With persist + manual SW |
| **Cache key** | SHA-256 of URL + body | `__typename` + `id` | `__typename` + `id` |
| **Auto-tags from operation name** | ✅ Built-in | ❌ Not supported | ❌ Not supported |
| **Normalized merge** | ❌ Per-URL caching | ✅ One mutation updates all queries | ✅ One mutation updates all queries |
| **Overlapping query merge** | ❌ Independent response caching | ✅ Automatic | ✅ Automatic |
| **Local-only fields** | ❌ Not supported | ✅ `@client` directives | ✅ `@local` directives |
| **Pagination** | Manual (URL-driven) | ✅ `fetchMore`, cursor-based | ✅ `usePaginationFragment` |
| **Subscriptions** | ✅ SSE push (SW-level) | ✅ WebSocket via `split` link | ✅ Via `graphql-ws` |
| **Offline mutations** | ✅ IndexedDB queue + SW replay | ❌ Not built-in | ❌ Not built-in |
| **Bundle cost** | 0 kB (generated code) | ~32 kB gzip | ~45 kB gzip |
| **Compiler** | None | None | Required (Relay Compiler) |
| **Framework coupling** | None (any framework) | React only | React only |

## The normalization tradeoff

Apollo's normalized cache is powerful but carries costs:

1. **Cache eviction complexity** — When entities are removed, all queries referencing them must update or invalidate. Apollo's `gc()` and eviction policies add management overhead.
2. **Persistence friction** — The in-memory normalized cache requires `persistCache` to survive tab close, with versioned serialization.
3. **No SW integration** — Normalized entities live in JavaScript memory, not the Cache Storage API. The SW cannot access or serve them. Offline requires a separate persistence layer.
4. **Bundle cost** — ~32 kB gzip for Apollo's cache + link chain + React. For apps that don't need normalized merging, this is pure overhead.

Swoff's per-URL caching trades normalized merge efficiency for simplicity, zero runtime cost, and native SW integration. If ten components each request different fields of the same entity, Swoff caches ten separate responses; Apollo caches the entity once and distributes it. For most apps, the ten-response overhead is negligible next to the complexity of managing a normalized cache.
