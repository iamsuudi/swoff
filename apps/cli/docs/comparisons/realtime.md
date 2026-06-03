# Real-Time: Swoff SSE Push vs WebSocket Subscriptions vs Polling

Real-time updates keep the UI in sync with server state without manual refetching. The mechanism choice (Server-Sent Events, WebSocket, or polling) determines infrastructure complexity, browser support, reconnection behavior, and SW compatibility.

## How Swoff does it

Swoff provides built-in Server-Sent Events (SSE) push for cache invalidation:

```
Server → SSE stream → SW receives event
  → SW dispatches TAG_INVALIDATED to clients
    → useCachedFetch auto-refetches
```

The connection is managed in the Service Worker for reliability across page navigations. When the SW is not yet active, a client-side fallback (`realtime/server-push.ts`) starts the connection.

**Event format (SSE):**
```
event: invalidate
data: {"tags": ["notes", "notes:id"]}
```

**Key properties:**
- **Transport:** SSE (text/event-stream). No WebSocket handshake, no frame parsing, no custom protocol.
- **Connection management:** SW-managed — survives page navigations. Client-side fallback if SW not active.
- **Browser reconnection:** SSE has native reconnection. The browser automatically reconnects on connection drop.
- **Scope:** Cache invalidation only. The server pushes tag names to invalidate; the SW handles cache clearing and refetching.
- **No bidirectional communication:** SSE is server-to-client only. Client-to-server communication uses regular HTTP.
- **Bundle cost:** 0 kB (generated code).

```ts
// Server (any language — Node, PHP, Go, etc.):
res.writeHead(200, {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
});
res.write("event: invalidate\ndata: " + JSON.stringify({ tags: ["notes"] }) + "\n\n");
```

## How competitors handle it

**TanStack Query:** No built-in real-time. Uses `refetchInterval` (polling) or manual `invalidateQueries()` triggered by a WebSocket message handler. The developer must implement the WebSocket connection, message parsing, and invalidation mapping independently.

**Apollo Client:** WebSocket-based subscriptions via `graphql-ws` or `subscriptions-transport-ws`. Full bidirectional communication with schema-driven subscription operations. Requires a WebSocket-compatible server and a subscription-enabled GraphQL schema.

**RxDB / ElectricSQL:** Continuous replication via WebSocket or custom protocol. The sync engine pushes changes from server to client and pulls local changes back. Includes conflict resolution, change tracking, and schema-aware synchronization.

## Comparison table

| Feature | Swoff | TanStack Query + manual WS | Apollo Subscriptions | RxDB / ElectricSQL |
|---|---|---|---|---|
| **Transport** | SSE (text/event-stream) | Developer chooses (WS, polling, etc.) | WebSocket (graphql-ws) | WebSocket or custom |
| **Connection management** | SW-managed (survives navigation) | Main thread (lost on navigation) | Main thread (Apollo client link) | Main thread (sync engine) |
| **Browser reconnection** | ✅ Native SSE reconnection | ❌ Developer implements | ✅ graphql-ws reconnection | ✅ Built-in reconnection |
| **Server complexity** | Simple — any HTTP server can send SSE | Varies by implementation | Requires WebSocket server + graphql-ws support | Requires sync engine server adapter |
| **Payload format** | JSON tags (invariant) | Developer-defined | GraphQL subscription response | Replication protocol |
| **Scope** | Cache invalidation only | Full data transfer | Full data transfer | Full data transfer + conflict resolution |
| **Bidirectional?** | ❌ Server→client only | Developer chooses | ✅ Yes | ✅ Yes |
| **SW integration** | ✅ SW receives events directly | ❌ Main thread only | ❌ Main thread only | ❌ Main thread only |
| **Cache integration** | ✅ Auto-invalidates + refetches | ✅ Manual `invalidateQueries()` in handler | ✅ Updates normalized cache | ✅ Updates local DB |
| **Offline support** | ✅ SW caches data for offline | ❌ Not offline-native | ❌ Not offline-native | ✅ Replication syncs when online |
| **Bundle cost** | 0 kB (generated code) | ~20 kB (TanStack Query) + WS library | ~32 kB (Apollo) + WS library | ~40 kB (RxDB) / ~3 MB (ElectricSQL) |

## Why SSE over WebSocket

SSE is simpler than WebSocket for Swoff's use case (server-to-client cache invalidation):

| Aspect | SSE | WebSocket |
|---|---|---|
| **Protocol** | Plain HTTP (no upgrade handshake) | Requires upgrade handshake + frame parsing |
| **Browser support** | ✅ All modern browsers (also IE11 via polyfill) | ✅ All modern browsers |
| **Native reconnection** | ✅ Built into EventSource API | ❌ Must implement manually |
| **Framing** | Simple text/event-stream format | Binary frame protocol |
| **Bidirectional** | ❌ No (not needed — invalidations are server→client) | ✅ Yes |
| **SW compatibility** | ✅ Works in SW via `fetch` event interception | 🟡 Requires manual message forwarding |

For cache invalidation, the server only needs to tell the client "revalidate X." This is a one-way signal. Bidirectional communication would add WebSocket handshake latency, reconnection logic, and frame parsing complexity for zero benefit.

## When to choose what

**Choose Swoff SSE push when:**
- You need server-driven cache invalidation (the most common real-time pattern)
- You want the connection to survive page navigations (SW-managed)
- You want native browser reconnection without custom code
- You want the simplest possible server integration (any HTTP server can write SSE)
- You don't need bidirectional real-time communication

**Choose WebSocket subscriptions when:**
- You need full bidirectional real-time communication (chat, collaborative editing, live cursors)
- You're already using Apollo Client for GraphQL and want subscription support
- Your server infrastructure already supports WebSocket
- You need real-time updates of derived data that doesn't map to cache invalidation
