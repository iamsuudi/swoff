# Real-Time: Swoff SSE Push vs WebSocket Subscriptions vs Polling

Real-time updates keep the UI in sync with server state without manual refetching. The mechanism choice (Server-Sent Events, WebSocket, or polling) determines infrastructure complexity, browser support, reconnection behavior, and SW compatibility.

## How Swoff does it

Swoff provides built-in server push for cache invalidation, supporting both SSE and WebSocket as transport. The connection is managed in the Service Worker for reliability across page navigations.

```
Server → SSE/WS stream → SW receives event
  → SW dispatches TAG_INVALIDATED to clients
    → useCachedFetch auto-refetches
```

**Transport options:**

```jsonc
{
  "features": {
    "serverPush": {
      "enabled": true,
      "type": "sse",           // or "websocket"
      "endpoint": "/api/events",
      "reconnectDelayMs": 5000
    }
  }
}
```

**SSE** (default, recommended): text/event-stream over plain HTTP. No upgrade handshake, no frame parsing, no custom protocol. Native browser reconnection via `EventSource`.

**WebSocket:** Full-duplex, available via `type: "websocket"`. The SW manages the WS connection the same way as SSE — messages feed into the same invalidation pipeline with configurable reconnection delay.

**Event format (both transports):**
```
event: invalidate
data: {"tags": ["notes", "notes:id"]}
```

**Key properties:**
- **Connection management:** SW-managed — survives page navigations. Client-side fallback if SW not active.
- **Browser reconnection:** SSE has native reconnection. WebSocket uses generated reconnection logic with configurable `reconnectDelayMs`.
- **Scope:** Cache invalidation only. The server pushes tag names; the SW handles cache clearing and refetching.
- **No bidirectional communication:** Server→client only. Client-to-server communication uses regular HTTP.
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

**TanStack Query:** No built-in real-time. Uses `refetchInterval` (polling) or manual `invalidateQueries()` triggered by a WebSocket message handler. The developer implements the WebSocket connection, message parsing, and invalidation mapping independently.

**Apollo Client:** WebSocket-based subscriptions via `graphql-ws`. Full bidirectional communication with schema-driven subscription operations. Requires a WebSocket-compatible server and a subscription-enabled GraphQL schema.

**RxDB / ElectricSQL:** Continuous replication via WebSocket or custom protocol. The sync engine pushes changes from server to client and pulls local changes back. Includes conflict resolution, change tracking, and schema-aware synchronization.

## Comparison table

| Feature | Swoff | TanStack Query + manual WS | Apollo Subscriptions | RxDB / ElectricSQL |
|---|---|---|---|---|
| **Transport** | SSE (default) or WebSocket (configurable) | Developer chooses (WS, polling, etc.) | WebSocket (graphql-ws) | WebSocket or custom |
| **Connection management** | SW-managed (survives navigation) | Main thread (lost on navigation) | Main thread (Apollo client link) | Main thread (sync engine) |
| **Browser reconnection** | ✅ Native SSE reconnection; WS with configurable delay | ❌ Developer implements | ✅ graphql-ws reconnection | ✅ Built-in reconnection |
| **Server complexity** | Minimal — any HTTP server can write SSE; WS for existing infra | Varies by implementation | Requires WebSocket server + graphql-ws support | Requires sync engine server adapter |
| **Payload format** | JSON tags (invariant) | Developer-defined | GraphQL subscription response | Replication protocol |
| **Scope** | Cache invalidation only | Full data transfer | Full data transfer | Full data transfer + conflict resolution |
| **Bidirectional?** | ❌ Server→client only (invalidation is one-way) | Developer chooses | ✅ Yes | ✅ Yes |
| **SW integration** | ✅ SW receives events directly | ❌ Main thread only | ❌ Main thread only | ❌ Main thread only |
| **Cache integration** | ✅ Auto-invalidates + refetches | ✅ Manual `invalidateQueries()` in handler | ✅ Updates normalized cache | ✅ Updates local DB |
| **Offline support** | ✅ SW caches data for offline | ❌ Not offline-native | ❌ Not offline-native | ✅ Replication syncs when online |
| **Bundle cost** | 0 kB (generated code) | ~20 kB (TanStack Query) + WS library | ~32 kB (Apollo) + WS library | ~40 kB (RxDB) / ~3 MB (ElectricSQL) |

## SSE vs WebSocket

Swoff supports both. SSE is the recommended default for cache invalidation because the signal is one-way — the server only needs to say "revalidate X." WebSocket is available when your server infrastructure already uses it.

| Aspect | SSE | WebSocket |
|---|---|---|
| **Protocol** | Plain HTTP (no upgrade handshake) | Requires upgrade handshake + frame parsing |
| **Browser reconnection** | ✅ Built into EventSource API | ❌ Must implement manually (Swoff generates it) |
| **Framing** | Simple text/event-stream format | Binary frame protocol |
| **Bidirectional** | ❌ No — not needed for invalidation | ✅ Yes |
| **SW compatibility** | ✅ Works in SW via `fetch` event interception | 🟡 Requires manual message forwarding |
