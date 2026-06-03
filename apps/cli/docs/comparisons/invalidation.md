# Cache Invalidation: Tag-Based vs Query-Key

Invalidation is the mechanism that tells the cache "this data is now stale — refetch it." The approach determines how much manual `invalidateQueries()` wiring the developer must write, whether invalidation survives page reloads, and whether it works across tabs.

## How Swoff does it

Swoff uses **URL-derived tags** with automatic generation, cascading dependencies, glob matching, and SW-confirmed invalidation.

**Tag generation:** Every `fetchWithCache` call generates tags from the URL path:
- `/api/notes` → `["notes"]`
- `/api/notes/123` → `["notes", "notes:id"]`
- `/api/notes?page=2` → `["notes", "notes:page"]`

The SW stores these tags in an IndexedDB registry mapping tags → URLs. When a mutation succeeds, it dispatches `TAG_INVALIDATED` to the SW, which:
1. Looks up all URLs registered under the tag.
2. Clears those entries from the Cache Storage API.
3. Queues background refetches for stale URLs.
4. Posts `TAG_INVALIDATED` back to all clients.
5. Each `useCachedFetch` for a matching URL auto-refetches.

```tsx
// After a successful POST /api/notes, the SW auto-invalidates "notes" tag.
// All tabs with useCachedFetch("/api/notes") refetch automatically.
```

**Key properties:**

- **Tag source:** URL path segments by default. Custom tags can be passed per-request. GraphQL operation names are used as tags for `queryGql`/`mutateGql`.
- **Cascading:** Tags can expand. Invalidating `notes` cascades to `notes:details` if configured.
- **Glob matching:** Tags support glob patterns (`notes:*` matches all note-related tags).
- **SW confirmation:** The `cache-invalidated` event fires *after* the SW confirms the cache is cleared, not before. Eliminates the "event before action" race.
- **Refresh queue:** After clearing cache entries, the SW refetches stale URLs in the background so the next read is fresh.
- **Tag registry repopulation:** If the IDB tag registry is deleted mid-refresh, the refresh queue repopulates it from the stored mutation tags.
- **Manual invalidation:** `invalidateByTag("notes")`, `invalidateByTags(["notes", "projects"])`, `invalidateUrl("/api/notes")`
- **Cross-tab:** SW broadcasts `TAG_INVALIDATED` via `self.clients.matchAll()` — every tab refetches without BroadcastChannel.

## How TanStack Query does it

TanStack Query uses **query-key-based invalidation**. The developer manually defines a query key (typically an array of strings) and calls `queryClient.invalidateQueries({ queryKey: ["notes"] })` after a mutation.

```tsx
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: (data) => fetch("/api/notes", { method: "POST", body: JSON.stringify(data) }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
});
```

**Key properties:**

- **Tag source:** Developer-defined query key. No automatic derivation from URL.
- **Cascading:** Not built-in. Must manually invalidate each related key.
- **Glob matching:** Partial match via `exact: false` (matches query keys that start with the given prefix).
- **Confirmation:** No SW confirmation. `invalidateQueries` immediately marks entries as stale. The next read refetches. There's no guarantee the old data is cleared before a read.
- **Refresh:** Automatic — stale queries refetch on next observer mount or on focus/reconnect.
- **Manual invalidation:** `queryClient.invalidateQueries({ queryKey })`, `queryClient.refetchQueries()`, `queryClient.removeQueries()`
- **Cross-tab:** Limited. `refetchOnWindowFocus` can detect focus, but the cache is per-tab. One tab's mutation doesn't invalidate another tab's cache unless the developer manually uses `BroadcastChannel` or a shared worker.

## Comparison table

| Feature | Swoff | TanStack Query | SWR |
|---|---|---|---|
| **Tag source** | Auto-derived from URL path + GraphQL op-name | Developer-defined query key | Developer-defined key |
| **Auto-generation** | ✅ URL path segments → tags automatically | ❌ Must define manually | ❌ Must define manually |
| **Cascading tags** | ✅ Client-expanded cascading rules | ❌ Not supported | ❌ Not supported |
| **Glob matching** | ✅ Full glob pattern support | 🟡 Prefix match only (`exact: false`) | ❌ Not supported |
| **SW confirmation** | ✅ Fires event after cache cleared | ❌ No SW — immediate stale mark | ❌ No SW — immediate stale mark |
| **Background refresh after clear** | ✅ SW refetches stale URLs automatically | ✅ Refetches on next observer mount | ✅ Refetches on next mount |
| **Cross-tab invalidation** | ✅ SW broadcasts to all clients | 🟡 Manual BroadcastChannel needed | ❌ Not supported |
| **Refresh queue persistence** | ✅ Survives SW restart (IDB) | ❌ In-memory only | ❌ In-memory only |
| **Tag introspection** | ✅ urls→tags, tags→urls (IDB registry) | ❌ Query key → query function only | ❌ Not supported |
| **Manual invalidation API** | `invalidateByTag(tag)`, `invalidateByTags(tags)`, `invalidateUrl(url)` | `invalidateQueries({ queryKey })`, `refetchQueries()`, `removeQueries()` | `mutate(key)`, `mutate(key, data)` |
| **Memory persistence** | IDB + Cache API (disk) | In-memory (wiped on reload) | In-memory (wiped on reload) |
| **Bundle cost** | 0 kB (generated code) | Included in ~20 kB | Included in ~10 kB |

## What auto-generated tags mean for developer experience

With TanStack Query, every query must have a manually defined query key, and every mutation must manually invalidate the corresponding query key:

```tsx
const { data: notes } = useQuery({
  queryKey: ["notes", { page }],
  queryFn: () => fetch(`/api/notes?page=${page}`).then(r => r.json()),
});

const mutation = useMutation({
  mutationFn: (data) => fetch("/api/notes", { method: "POST", body: JSON.stringify(data) }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["notes"] });
  },
});
```

With Swoff, the URL itself drives invalidation:

```tsx
const { data: notes } = useCachedFetch(`/api/notes?page=${page}`);
// POST /api/notes automatically invalidates the "notes" tag
// useCachedFetch("/api/notes?page=...") auto-refetches
// No manual invalidateQueries call needed
```

This is not a minor convenience — it eliminates an entire category of bugs. Every manual `invalidateQueries` call is a potential miss: wrong query key, forgotten invalidation, stale data shown indefinitely. Auto-invalidation based on the mutation URL and auto-tags from the URL path mean the correct invalidation happens by default.

## When SW confirmation matters

TanStack Query's `invalidateQueries` marks the cache as stale immediately. If a component reads the query cache between the `invalidateQueries` call and the refetch completing, it sees stale data.

Swoff's `cache-invalidated` event fires only after the SW confirms the cache entry is deleted. The sequence is:

```
1. Mutation succeeds
2. Client sends INVALIDATE_TAG to SW
3. SW deletes cache entries for matching URLs
4. SW posts TAG_INVALIDATED back to client
5. Client dispatches cache-invalidated event
6. useCachedFetch refetches
```

Between step 1 and step 6, any `fetchWithCache` call for the invalidated URL goes to the SW, which checks the cache (already cleared) and fetches fresh data. There is no window where the client can read stale data.

## When to choose what

**Choose Swoff when:**
- You want invalidation to work automatically from URL paths without manual query-key management
- You need invalidation to survive page reloads and persist in IDB
- You need cross-tab cache invalidation without BroadcastChannel boilerplate
- You need SW confirmation guarantees — no stale read window between invalidation and refetch
- You need advanced invalidation patterns (cascading tags, glob matching, tag introspection)

**Choose TanStack Query when:**
- Your query keys don't map naturally to URL paths (e.g., dependent/derived queries, GraphQL fragments)
- You need normalized cache updates (one mutation updates all queries referencing the same entity — TanStack Query's structural sharing)
- You prefer explicit, manually-maintained invalidation for clarity in a team setting
- You already use TanStack Query's devtools and want invalidation visible in the inspector
