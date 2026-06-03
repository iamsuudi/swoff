# Optimistic Updates: The Distributed System Trap

Optimistic updates — applying mutations to the UI instantly before the server confirms — transform your frontend into a distributed system. Every edge case that follows is a distributed systems problem: conflict resolution, causal ordering, idempotency, cascading failure, and reconciliation. The complexity is not optional — it is the problem.

Swoff does not implement optimistic updates. This is not a missing feature; it is a deliberate architectural boundary. The Telegram pattern — pending state until server confirmation — avoids the entire class of problems documented below.

## The phantom ID problem deep dive

When a resource is created offline, it has no server-assigned ID. The client assigns a temporary ID. Every subsequent mutation referencing that resource must use this temp ID. When the queue replays, the temp ID must be mapped to the real server ID. This already fails in several ways:

**Server rejects the create.** The server returns 400 or 403 — validation error, permission denied, duplicate detected. The temp ID never becomes real. All dependent mutations (edits, comments, shares, tags) now reference a phantom. There is no automatic cascading rollback. The local database now contains orphaned records that no sync engine can resolve.

```
1. Create Note → temp-id: "t1" → stored locally
2. Add Comment → references "t1" → stored locally
3. Share Note → references "t1" → stored locally
4. Online → replay
5. Create Note → server rejects (title too long)
6. "t1" never becomes real
7. Comment and Share mutations reference a phantom ID
8. They will also fail → three orphaned records in local DB
```

Client DBs do not solve this. They map temp IDs on success, but on rejection there is no reverse mapping to find and clean up dependent mutations. Doing so requires full knowledge of your foreign key graph — application-level logic that no sync engine provides generically.

**Server creates with a different ID than expected.** Some servers assign IDs that don't match the client's ID format (e.g., UUIDs vs auto-increment integers, or a server that uses a different ID generation scheme). The mapping layer must handle format conversion.

**Server creates but returns a stale representation.** The server accepts the create but the returned entity has server-computed fields the client didn't send — `createdAt`, `updatedAt`, `slug`, `normalizedTitle`, `ownerId`. The optimistic local copy lacks these fields. Any dependent mutation that assumed the local shape will be wrong.

## Cascade failure in mutation chains

Real apps don't perform isolated mutations. They chain them:

- Create order → Add line items → Apply discount → Update inventory
- Create post → Upload image → Tag collaborators → Notify followers
- Register user → Create profile → Send verification → Set preferences

Each mutation in the chain depends on the previous one succeeding. When any link in the chain fails, all subsequent mutations are invalid. The failure can happen for reasons the client cannot predict:

- **Business rule violation:** "This user already has 5 active orders." The sixth is rejected server-side.
- **Rate limit exceeded:** The API allows 10 creates per minute. The 11th fails.
- **Server-side trigger error:** The `AFTER INSERT` trigger on the database threw an exception.
- **Referential integrity:** A foreign key constraint on the server references a record that was deleted by another user.
- **Concurrent modification:** Another user deleted the parent entity while you were offline editing its child.

The cascade depth is unbounded. Every level multiplies the potential failure surface. Client DBs leave this entirely to the developer to handle — with no framework support for cascading rollback.

## Server-side state the client cannot know

The server has information the client does not:

- **Computed fields:** `totalPrice = SUM(line_items.price)`. The client optimistically sets a total, but the server recalculates. If the recalculation differs, the client shows the wrong total until the next sync.
- **Slug generation:** `slug = slugify(title)`. If the slug is already taken, the server appends a suffix. The client's optimistic slug is wrong.
- **Auto-incrementing counters:** `position = MAX(position) + 1`. Two offline clients both use position 5. Only one survives.
- **Timestamps:** `updatedAt = NOW()`. The client's optimistic timestamp diverges from the server's clock.
- **Derived state:** `isComplete = ALL(items.checked)`. A check on item 7 may complete the parent. The optimistic local state doesn't know because it can't evaluate cross-entity derived state without schema awareness.
- **Server middleware:** Authentication checks, audit logs, webhook dispatches, cache invalidation for CDNs — all happen server-side after the mutation is accepted. The optimistic client has no visibility into these effects.

Every one of these can cause the server's response to differ from the optimistic local state. The client must reconcile the difference — which means either overwriting the optimistic state (destroying the illusion of instant UX) or showing stale diverged data until the next sync.

## Permission and auth edge cases

- **Token expires mid-queue.** A batch of 10 mutations replays. After mutation 5, the auth token expires. The remaining 5 fail with 401. The first 5 succeeded. The queue is now in an inconsistent state — partial success with no automatic cleanup.
- **Permission revoked while offline.** User A was an admin when they went offline. They created, edited, and deleted resources. When they come back online, their admin role has been removed. All their mutations from the offline session fail with 403.
- **Resource deleted by another user.** User B deletes a document on the server while User A is offline editing it. User A's edit replays against a deleted resource — 404 or 410. The client has no mechanism to know the resource no longer exists.
- **Ownership changes.** Resource was reassigned to a different team while the original owner was offline. Their mutations are rejected by server authorization rules.

These are not edge cases — they are routine scenarios in any multi-user application. Client DBs provide no framework-level handling for any of them.

## The CRDT illusion

CRDTs (Conflict-free Replicated Data Types) are often marketed as the solution to offline conflicts. They solve exactly one problem: concurrent edits to the *same field* of the *same document* by *different users*. They do not solve:

- Server validation rejection (CRDTs cannot make a 400 become a 200)
- Cascading failure across dependent mutations
- Foreign key constraint violations
- Business rule enforcement
- Permission changes
- Server-computed field divergence
- Schema migration conflicts
- Partial batch failure
- Any scenario where the server says "no"

CRDTs also require application-level schema awareness. The developer must define which data types use CRDT semantics, how they merge, and what happens during conflicting edits. This is not automatic — it is additional configuration and maintenance burden.

## The differential dataflow mirage

TanStack DB's differential dataflow promises efficient cache updates by tracking fine-grained data dependencies. This does not solve the fundamental problem: the server can reject a mutation for reasons no dataflow graph can predict. Differential dataflow optimizes *when* updates propagate, not *whether* they succeed. A rejected mutation still leaves the system in an inconsistent state regardless of how efficiently the dataflow runs.

## Why client DBs cannot escape this

The root problem is structural: client DBs embed a *copy* of server data in the browser and allow the user to modify it independently. This is a distributed database by definition. Every CAP theorem tradeoff applies:

- **Consistency:** The client and server can diverge arbitrarily during offline periods. The sync engine eventually converges, but "eventually" may be minutes, hours, or never (if the queue fails).
- **Availability:** The client DB is always available — that's the point. But availability without consistency means the user acts on stale or diverged data.
- **Partition tolerance:** Network partitions (offline periods) are the entire use case. The system must tolerate them, which means sacrificing consistency.

Client DBs choose AP (Availability + Partition tolerance) over consistency. They accept that the client and server will diverge, and they provide tools (CRDTs, merge functions, conflict handlers) to reconcile divergence. These tools are partial — they handle some scenarios but leave many to the developer. The complexity of the remaining scenarios is not a bug; it is a consequence of the CAP theorem, and no library can engineer around it.

## Enterprise reality

No major enterprise application uses a client-side embedded database for its primary data layer. Google Docs uses operational transformation + WebSocket. Figma uses WebSocket + CRDT for canvas state. Notion uses optimistic local state with server confirmation and manual conflict resolution. These apps invest heavily in distributed systems engineering because they have to — their core product IS collaborative editing.

For a typical web application — dashboards, e-commerce, content management, social feeds — the complexity of client-side distributed database management is disproportionate to the benefit. The correct architecture is:

- **SW-level cache** ensures the app loads and displays data offline.
- **Mutation queue** captures writes and replays them when online.
- **Pending state** shows the user their writes are not yet confirmed.
- **Network-first strategy** serves fresh data when online, cached data when offline.

This is Swoff's architecture. It does not give you instant optimistic UI. It gives something more valuable: a system where the server remains the source of truth, the client never acts on phantom data, and the developer is not responsible for a distributed database they did not ask for.

## What Swoff says

Swoff does not generate optimistic update code. There is no `useOptimisticMutation`, no `onMutate`, no automatic rollback. The `onMutate` and `onError` callbacks mentioned in the API are generic lifecycle hooks — they do not implement optimistic updates. Developers are free to build optimistic UI on top using whatever state management they choose, but Swoff does not provide it because doing so correctly requires coupling to the application's data model and distributed systems knowledge that Swoff deliberately abstracts away.

The recommended pattern is the Telegram approach: show pending state, disable dependent actions, and replace with confirmed state on server response. This works with any API, any data model, and any backend — and it does not require the developer to become a distributed systems engineer.
