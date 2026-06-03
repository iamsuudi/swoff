# Optimistic Updates: Why Swoff Excludes Them

Optimistic updates — applying mutations to the UI instantly before the server confirms — are a deliberate exclusion from Swoff's architecture. This is not a missing feature; it is a boundary Swoff intentionally does not cross.

## The phantom ID problem

When a note is created offline via the mutation queue, it has no server-assigned ID. The app shows it optimistically with a temporary client-side ID. The user edits this note — that edit is also queued as a mutation referencing the temporary ID. When the queue replays:

```
Create note (offline) → temp ID: "temp-1"
  → Queue: [{ type: "create", body: { title: "Hello" }, tempId: "temp-1" }]

Edit note (offline) → references "temp-1"
  → Queue: [{ type: "create", body: ... }, { type: "edit", id: "temp-1", body: ... }]

Online → replay
  → Create mutation succeeds → server returns real ID: 42
  → Edit mutation fires with id: "temp-1" → server rejects (no record with that ID)
  → Edit fails → optimistic data is stale
```

Resolving this requires either:
- A client-side ID mapping layer that translates temp → real IDs across dependent mutations.
- A schema-aware system that knows which fields are IDs and rewrites mutation bodies.

Both approaches couple Swoff to the application's data model — a boundary Swoff deliberately does not cross.

## How enterprise apps handle this

The most successful offline-first consumer app — Telegram — does not use optimistic updates for edits. When you send a message offline:

1. The message appears as "pending" (with a clock icon).
2. You cannot edit, reply to, or delete that message until it is synced with the server.
3. After sync, the pending state is replaced by confirmed server state.

This pattern avoids phantom IDs entirely. A pending message has no server-assigned ID, so no dependent action can reference it incorrectly.

Swoff's mutation queue follows this same pattern:

```
Mutation → queued in IDB (pending state)
  → UI shows pending state (clock icon, disabled actions)
  → SW replays when online
  → Mutation succeeds → SW invalidates cache
  → useCachedFetch refetches fresh data
  → Pending state replaced by confirmed server state
```

## The normalized cache dependency

TanStack Query enables optimistic updates because it has a normalized cache. When an optimistic update mutates one cache entry, every query referencing that entity reflects the change. A rollback updates all derived queries atomically.

Libraries like TanStack Query couple query keys to a normalized in-memory store — every query key maps to the same underlying entity, so a rollback updates all derived queries consistently. This requires a schema-aware normalized store that Swoff's SW-level cache does not (and should not) provide.

Swoff caches HTTP responses by URL. Optimistic updates would require:
1. Finding all cached URLs that might contain the mutated data.
2. Modifying each cached response in place.
3. Rolling back all modifications on failure.
4. Coordinating this across all tabs via the SW.

This is technically possible but couples Swoff to the shape of every API response — the same schema coupling Swoff's architecture intentionally avoids.

## What Swoff provides instead

Swoff provides the primitives for the developer to build optimistic UI at the application layer:

- **`onMutate` callback** in `useMutation` — called before the mutation fires. The developer can set local state here.
- **`onError` callback** — called on failure. The developer can roll back local state here.
- **Pending mutation visibility** — `useMutationQueue()` exposes pending items. The UI can show pending state and disable edit/delete on those items.

```tsx
const { mutate } = useMutation("/api/notes", {
  method: "POST",
  onMutate: () => setOptimisticData(/* ... */),
  onError: () => rollbackOptimisticData(/* ... */),
});
```

This is the same pattern TanStack Query exposes, minus the automatic rollback across all derived queries. The difference is that TanStack Query can deroll because it knows the schema; Swoff does not.

## Why this is the right tradeoff

| Approach | Pros | Cons |
|---|---|---|
| **Optimistic (TanStack Query)** | Instant UI, automatic rollback | Phantom IDs, schema coupling, response-shape dependency |
| **Pending (Swoff/Telegram)** | No phantom IDs, no schema coupling, simpler code, works with any API response shape | Pending state visible to user, no instant data appearance |

For apps that need instant optimistic UI, Swoff is not the right tool — use TanStack Query at the application layer, optionally backed by Swoff's SW cache at the infrastructure layer. The two can coexist: Swoff handles SW-level caching and offline, TanStack Query handles application-level optimistic updates.
