# Server Push — SSE / WebSocket (replaces Socket.io)

> **If you're coming from Socket.io for real-time updates:** Swoff's server push connects to your SSE or WebSocket endpoint from the Service Worker, not from the page. The connection survives navigation, tab refresh, and doesn't consume page memory. When the server sends tags, the SW invalidates cached responses across all tabs — no need to manually wire up socket events to cache invalidation. See the [full comparison](../comparisons/realtime.md).

## Preconditions

- Swoff initialized with data fetching and tag invalidation enabled
- **Cookie auth required** — bearer and custom auth are incompatible (the SW has no DOM to refresh tokens)
- A server endpoint that sends SSE events or WebSocket messages

## Enable

```bash
npx @swoff/cli add server-push
```

Or set config manually:

```json
{
  "features": {
    "realtime": {
      "serverPush": {
        "enabled": true,
        "type": "sse",
        "endpoint": "/api/events",
        "reconnectDelayMs": 5000
      }
    }
  }
}
```

## Generated files

| File                            | What it does                                                   | Import in your code?    |
| ------------------------------- | -------------------------------------------------------------- | ----------------------- |
| `swoff/realtime/server-push.ts` | SSE/WS connection manager (runs in SW, no page imports needed) | No — auto-managed by SW |

No page-side imports needed. The SW connects to your endpoint on activation and manages reconnection.

## Usage

### Server sends tags for invalidation

```json
// SSE event data or WebSocket message:
{
  "tags": ["notes", "users:456"]
}
```

The SW receives this and calls `invalidateByTags(["notes", "users:456"])`. All tabs re-fetch the affected data on their next `fetchWithCache` call.

### Multiple tags per event

```json
{
  "tags": ["notes", "dashboard", "stats:*"]
}
```

Supports glob patterns — `stats:*` invalidates all cache entries under any `stats:*` tag.

### Connection lifecycle

The SW manages:

- Auto-connect on SW activation
- Reconnect with exponential backoff (respects `reconnectDelayMs`)
- Connection survives navigation and tab refresh
- Connection drops when the SW is terminated (browser idle) — re-established on next navigation or push

## Customize

Connection parameters are config-only. No generated files to edit.

To customize reconnection behavior, adjust `reconnectDelayMs` in config. The SW doubles the delay on each failure, capped by the initial value.

## Config

```json
{
  "features": {
    "tagInvalidation": {
      "enabled": true
    },
    "realtime": {
      "serverPush": {
        "enabled": true,
        "type": "sse",
        "endpoint": "/api/events",
        "reconnectDelayMs": 5000
      }
    }
  }
}
```

- `type` — `"sse"` (Server-Sent Events) or `"websocket"`
- `endpoint` — URL of your server push endpoint
- `reconnectDelayMs` — initial reconnect delay; doubles on each failure (capped at this value)

### Important: tagInvalidation must be enabled

Server push works by calling `invalidateByTags()` in the SW. If `tagInvalidation.enabled` is `false`, the tag database is empty and no invalidation occurs. Server push requires tag invalidation to be on.

### SSE vs WebSocket

| Aspect          | SSE                        | WebSocket                 |
| --------------- | -------------------------- | ------------------------- |
| Direction       | Server → client only       | Bidirectional             |
| Reconnection    | Built-in (EventSource API) | Manual (Swoff handles it) |
| Payload         | Text only                  | Text or binary            |
| Browser support | All modern browsers        | All modern browsers       |
| When to use     | Simple push from server    | Need 2-way communication  |

## Related

- [Full comparison: Real-time invalidation](../comparisons/realtime.md)
- [Tag invalidation: glob patterns, cascading](./05-tag-invalidation.md)
- [Auth guide: why cookie auth is required](./04-auth.md)
- [Config reference: realtime](../CONFIG.md#featuresrealtime)
