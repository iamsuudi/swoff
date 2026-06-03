# Cross-Tab Synchronization: Swoff vs BroadcastChannel vs Storage Events

Cross-tab synchronization keeps cache state consistent across multiple open tabs. When a mutation succeeds in one tab, all other tabs should reflect the updated data without manual refetching.

## How Swoff does it

Swoff uses the Service Worker as a central message hub. When a mutation succeeds in one tab:

```
Tab A: mutation success → dispatch INVALIDATE_TAG to SW
  → SW: clears cache entries for tag
  → SW: posts TAG_INVALIDATED to all clients (self.clients.matchAll())
  → Tab B: receives TAG_INVALIDATED → dispatches cache-invalidated event
  → Tab B: useCachedFetch for matching tag auto-refetches
```

**Key properties:**
- **Transport:** `self.clients.matchAll()` — the SW posts messages to every connected client. No BroadcastChannel API needed.
- **Scope:** Every tab with the same origin receives the event. Tabs don't need to be same-window (different browser windows, different tabs).
- **Coverage:** All cache invalidation events (auto-invalidation after mutations, manual `invalidateByTag`, mutation queue sync completion).
- **Auth sync:** `sw-auth-state-change` is broadcast to all tabs. Logout in one tab logs out all tabs.
- **Background sync events:** Mutation queue progress and completion are broadcast to all tabs.

## How competitors handle it

**TanStack Query:** No built-in cross-tab sync. The `refetchOnWindowFocus` option refetches when a tab gains focus, but this is a per-tab heuristic, not a true sync. Developers can implement cross-tab sync using `BroadcastChannel` API with manual coordination.

**Apollo Client:** No built-in cross-tab sync. Each tab maintains its own in-memory normalized cache. A mutation in one tab does not update other tabs' caches.

**RxDB:** Built-in cross-tab replication via `BroadcastChannel`. Changes in one tab are broadcast to all other tabs and applied to their local databases.

## Comparison table

| Feature | Swoff | TanStack Query | Apollo Client | RxDB |
|---|---|---|---|---|
| **Transport** | SW `clients.matchAll()` | None (manual BroadcastChannel) | None | BroadcastChannel |
| **Survives SW restart?** | ✅ Yes (IDB-persisted tag registry) | ❌ No SW | ❌ No SW | ❌ BroadcastChannel lost on tab close |
| **Cache type synced** | All cache tags (URL responses) | None by default | None by default | Local DB documents/collections |
| **Mutation sync** | ✅ Auto-invalidation after mutation | 🟡 Manual `invalidateQueries` + BroadcastChannel | ❌ Not supported | ✅ Auto-replication |
| **Auth sync** | ✅ `sw-auth-state-change` to all tabs | ❌ Not supported | ❌ Not supported | ❌ Not supported |
| **Queue progress sync** | ✅ Mutation queue events to all tabs | ❌ Not supported | ❌ Not supported | ✅ Replication status |
| **BroadcastChannel dependency** | ❌ Not needed — uses SW directly | ✅ Required for cross-tab sync | ✅ Required for cross-tab sync | ✅ Built-in |
| **Tab discovery** | Automatic (SW knows all clients) | Manual (BroadcastChannel open/close) | Manual | Automatic (BroadcastChannel) |
| **Bundle cost** | 0 kB (generated code) | N/A + BroadcastChannel API | N/A + BroadcastChannel API | Includes BroadcastChannel handling |

## Why SW broadcast beats BroadcastChannel

`BroadcastChannel` is a dedicated browser API for cross-context messaging. It works well but has limitations:

1. **Lost on SW restart:** BroadcastChannel is main-thread only. If all tabs close and the SW replays mutations via Background Sync, there's no BroadcastChannel to notify — the new cached responses are ready but no tab knows to refetch. Swoff's SW-based broadcast handles this because the SW sends `TAG_INVALIDATED` to any client that reconnects.
2. **Multiple channels:** Each feature (invalidation, auth, queue) requires a separate BroadcastChannel or a multiplexed message format. Swoff uses a single SW message channel with typed events.
3. **Tab lifecycle:** BroadcastChannel requires the developer to manage open/close events and re-register listeners on each navigation. SW messages are automatically delivered to every connected client without lifecycle management.

## When to choose what

**Choose Swoff when:**
- You need cross-tab cache invalidation without adding BroadcastChannel code
- You want auth state to sync across tabs automatically
- You want mutation queue progress visible in all tabs
- You need invalidation to work even when the mutation replayed after all tabs closed (Background Sync → SW broadcast)

**Choose BroadcastChannel when:**
- You're not using a Service Worker at all
- You need cross-tab communication beyond cache invalidation (shared state, chat, collaborative features)
- You want to manually control which messages are broadcast and when
