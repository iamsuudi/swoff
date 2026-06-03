# GraphQL: Swoff vs Apollo Client / Relay

GraphQL caching is one of the most architecturally distinct features across libraries. The approach splits between **body-hash URL caching** (Swoff) and **normalized in-memory caches** (Apollo, Relay). These are fundamentally different primitives that serve different app profiles.

## How Swoff does it

Swoff treats GraphQL queries and mutations as HTTP requests with POST bodies. The cache key is a deterministic hash of the request URL + body:

```ts
const cacheKey = await bodyHash({ query: LIST_QUERY, variables });
// → "a1b2c3d4e5f6g7h8"
// SW caches by this key in the Cache Storage API
```

**Key properties:**

- **Storage:** Cache Storage API (disk-backed, survives reloads and SW restarts).
- **Cache key:** SHA-256 hash of the full request body (query + variables). Deterministic — same query + same variables = same cache entry.
- **Tags:** Automatically derived from the GraphQL operation name. `query GetNotes` generates tag `"GetNotes"`. Mutations auto-invalidate the matching query's tag.
- **Offline:** Natively offline. Cached GraphQL responses are served from the SW cache.
- **No normalized merging:** Each query result is cached as a complete response. If two queries overlap in data, the cache stores both responses independently.

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
  // Auto-invalidates "DeleteNote" tag
  // "GetNotes" tag is a cascading dependency — useCachedFetch refetches
);
```

## How Apollo Client does it

Apollo Client uses a **normalized in-memory cache**. Every GraphQL response is split into individual entities (identified by `__typename` + `id`), stored in a flat `Map`, and reassembled on read:

```ts
// Response: { notes: [{ __typename: "Note", id: 1, title: "Hello" }] }
// Stored as: cache["Note:1"] = { __typename: "Note", id: 1, title: "Hello" }
// Query reads: cache.readFragment({ id: "Note:1", fragment: gql`...` })
```

**Key properties:**

- **Storage:** In-memory `InMemoryCache` (wiped on tab close, survives via optional `persistCache` to IDB).
- **Cache key:** `__typename` + `id` (or custom `keyFields`). Entity-based, not request-based.
- **Tags:** No built-in tag system. Custom `afterware` or manual cache eviction.
- **Offline:** Requires `persistCache` adapter. No SW integration.
- **Normalized merging:** Mutations that update an entity automatically update all queries referencing that entity.

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
| **Offline mutations** | ✅ IndexedDB queue + SW replay | ❌ Not built-in (requires 3rd party) | ❌ Not built-in |
| **Bundle cost** | 0 kB (generated code) | ~32 kB gzip | ~45 kB gzip |
| **Compiler** | None | None | Required (Relay Compiler) |
| **Framework coupling** | None (any framework) | React only | React only |

## When each model excels

**Swoff's body-hash caching is better when:**
- GraphQL queries are unique per page/view (no overlapping fragments across components)
- The primary concern is offline reliability, not cache efficiency
- You want GraphQL caching without adding a 30 kB+ runtime library
- You want offline mutation queuing for GraphQL mutations
- You want the SW to cache GraphQL responses alongside REST responses in the same cache

**Apollo/Relay's normalized caching is better when:**
- The same entities appear in many different queries across the app
- A single mutation should update every query that references the mutated entity
- You need client-only state management alongside server data (`@client` directives)
- You need advanced pagination (cursor-based, offset-based, relay-style connections)
- Your app is already React-only and Apollo/Relay is the team's standard

## The normalization tradeoff

Apollo's normalized cache is powerful but comes with costs:

1. **Cache eviction complexity** — When entities are removed from the cache, all queries referencing them must be updated or invalidated. Apollo's `gc()` and cache eviction policies add complexity.
2. **Cache persistence** — The in-memory normalized cache requires a persistence layer (`persistCache`) to survive tab close. This adds setup and the persisted format must be versioned.
3. **No SW integration** — Normalized cache data lives in JavaScript memory, not in the Cache Storage API. The SW cannot access or serve normalized entities. Offline requires a separate persistence mechanism.
4. **Bundle cost** — Apollo's normalized cache + link chain + React integration is ~32 kB gzip. For apps that don't need normalized merging, this is pure overhead.

Swoff's per-URL caching trades normalized merge efficiency for simplicity, zero runtime cost, and native SW integration. The tradeoff is: if 10 components each request different fields of the same entity, Swoff caches 10 separate responses. Apollo caches the entity once and distributes it to all 10. For most apps, the 10-response overhead is negligible compared to the complexity of managing a normalized cache.
