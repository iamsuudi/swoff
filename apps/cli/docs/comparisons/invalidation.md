# Cache Invalidation: Tag-Based vs Query-Key

Invalidation tells the cache "this data is now stale — refetch it." The approach determines how much manual wiring the developer writes, whether invalidation survives page reloads, and whether it works across tabs.

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

**Key properties:**
- **Tag source:** URL path segments by default. Custom tags can be passed per-request. GraphQL operation names are used as tags for `queryGql`/`mutateGql`.
- **Cascading:** Tags can expand — invalidating `notes` cascades to `notes:details` if configured.
- **Glob matching:** Tags support glob patterns (`notes:*` matches all note-related tags).
- **SW confirmation:** `cache-invalidated` fires *after* the SW confirms the cache is cleared. No "event before action" race.
- **Refresh queue:** After clearing entries, the SW refetches stale URLs in the background so the next read is fresh.
- **Tag registry repopulation:** If the IDB tag registry is deleted mid-refresh, the queue repopulates it from stored mutation tags.
- **Manual invalidation:** `invalidateByTag("notes")`, `invalidateByTags(["notes", "projects"])`, `invalidateUrl("/api/notes")`
- **Cross-tab:** SW broadcasts `TAG_INVALIDATED` via `self.clients.matchAll()` — every tab refetches without BroadcastChannel.

## How TanStack Query does it

TanStack Query uses **query-key-based invalidation**. The developer manually defines a query key and calls `queryClient.invalidateQueries({ queryKey: ["notes"] })` after a mutation.

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
- **Glob matching:** Partial match via `exact: false` (prefix match only).
- **Confirmation:** No SW confirmation. `invalidateQueries` immediately marks entries as stale — no guarantee old data is cleared before a read.
- **Refresh:** Stale queries refetch on next observer mount or on focus/reconnect.
- **Cross-tab:** Limited. Cache is per-tab. One tab's mutation doesn't invalidate another tab's cache without manual BroadcastChannel setup.

## Comparison table

| Feature | Swoff | TanStack Query | SWR |
|---|---|---|---|
| **Tag source** | Auto-derived from URL + GraphQL op-name | Developer-defined query key | Developer-defined key |
| **Auto-generation** | ✅ URL path segments → tags automatically | ❌ Must define manually | ❌ Must define manually |
| **Cascading tags** | ✅ Client-expanded cascading rules | ❌ Not supported | ❌ Not supported |
| **Glob matching** | ✅ Full glob pattern support | 🟡 Prefix match only (`exact: false`) | ❌ Not supported |
| **SW confirmation** | ✅ Fires event after cache cleared | ❌ No SW — immediate stale mark | ❌ No SW — immediate stale mark |
| **Background refresh after clear** | ✅ SW refetches stale URLs automatically | ✅ Refetches on next observer mount | ✅ Refetches on next mount |
| **Cross-tab invalidation** | ✅ SW broadcasts to all clients | 🟡 Manual BroadcastChannel needed | ❌ Not supported |
| **Refresh queue persistence** | ✅ Survives SW restart (IDB) | ❌ In-memory only | ❌ In-memory only |
| **Tag introspection** | ✅ urls→tags, tags→urls (IDB registry) | ❌ Query key → query function only | ❌ Not supported |
| **Manual invalidation API** | `invalidateByTag`, `invalidateByTags`, `invalidateUrl` | `invalidateQueries`, `refetchQueries`, `removeQueries` | `mutate(key)` |
| **Memory persistence** | IDB + Cache API (disk) | In-memory (wiped on reload) | In-memory (wiped on reload) |
| **Bundle cost** | 0 kB (generated code) | Included in ~20 kB | Included in ~10 kB |

## What auto-generated tags mean for developer experience

With TanStack Query, every query needs a manually defined query key and every mutation must manually invalidate it:

```tsx
const { data: notes } = useQuery({
  queryKey: ["notes", { page }],
  queryFn: () => fetch(`/api/notes?page=${page}`).then(r => r.json()),
});

const mutation = useMutation({
  mutationFn: (data) => fetch("/api/notes", { method: "POST", body: JSON.stringify(data) }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
});
```

With Swoff, the URL itself drives invalidation:

```tsx
const { data: notes } = useCachedFetch(`/api/notes?page=${page}`);
// POST /api/notes automatically invalidates the "notes" tag
// No manual invalidateQueries call needed
```

Every manual `invalidateQueries` call is a potential miss: wrong query key, forgotten invalidation, stale data shown indefinitely. Auto-invalidation from the mutation URL means the correct invalidation happens by default.

## When SW confirmation matters

TanStack Query's `invalidateQueries` marks the cache as stale immediately. If a component reads the query cache between the invalidation and the refetch completing, it sees stale data.

Swoff's `cache-invalidated` event fires only after the SW confirms the cache entry is deleted:

```
1. Mutation succeeds
2. Client sends INVALIDATE_TAG to SW
3. SW deletes cache entries for matching URLs
4. SW posts TAG_INVALIDATED back to client
5. Client dispatches cache-invalidated event
6. useCachedFetch refetches
```

Between step 1 and step 6, any `fetchWithCache` call for the invalidated URL goes to the SW, which checks the cache (already cleared) and fetches fresh data. There is no stale-read window.
