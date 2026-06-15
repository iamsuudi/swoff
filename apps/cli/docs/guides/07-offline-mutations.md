# Offline Mutations & Background Sync (replaces RxDB)

> **If you're coming from RxDB for offline sync:** Swoff doesn't replicate a client-side database. Instead, it queues POST/PUT/PATCH/DELETE requests in IndexedDB when offline and replays them when connectivity returns. No schema, no replication protocol, no WebSocket sync engine. Each queued mutation is just a stored HTTP request. See the [full comparison](../comparisons/offline-queue.md).

## Preconditions

- Swoff initialized with data fetching enabled
- **For background sync:** cookie auth (bearer and custom auth are incompatible — see auth guide)

## Enable

```bash
# Step 1: queue mutations when offline
npx @swoff/cli add mutation-queue
```

```bash
# Step 2 (optional): enable Background Sync API for sync after tab close
# Requires cookie auth
npx @swoff/cli add background-sync
```

Or set config manually:

```json
{
  "features": {
    "mutationQueue": {
      "enabled": true,
      "backgroundSync": true,
      "batchSize": 1,
      "batchDelayMs": 0,
      "retry": {
        "maxRetries": 5,
        "backoffMs": 1000,
        "maxBackoffMs": 30000,
        "jitterMs": 250
      }
    }
  }
}
```

## Generated files

| File                      | What it does                                                                                                                                  | Import in your code?     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `swoff/mutation/queue.ts` | `queueMutation()`, `processMutationQueue()`, `clearQueue()`, `flushMutations()`, `getPendingCount()`, `getQueueItems()`, `getQueuePosition()` | Yes                      |
| `swoff/mutation/state.ts` | Mutation state tracking (per-mutation lifecycle)                                                                                              | Yes, for UI              |
| `swoff/mutation/sync.ts`  | `syncWhenPossible()`, `retrySync()`                                                                                                           | Yes, for background sync |

## Usage

```ts
import { fetchWithCache } from "./swoff/fetch/core";
import {
  getPendingCount,
  getQueueItems,
  clearQueue,
} from "./swoff/mutation/queue";
import { flushMutations } from "./swoff/mutation/queue";

// Queue a write — works offline, replays when online
const { response, queued } = await fetchWithCache("/api/notes", {
  method: "POST",
  body: JSON.stringify({ title: "New Note" }),
  mutation: true, // 👈 queues offline, replays on reconnect
});
// queued === true means it was stored offline for later replay
// On successful replay, auto-invalidates related tags

// Show sync status
const count = await getPendingCount();
if (count > 0) {
  console.log(`${count} mutations waiting to sync`);
}

// Inspect queue
const items = await getQueueItems();
// items = [{ id, method, url, body, retryCount, status, ... }]

// Clear all queued mutations (e.g., on logout)
await clearQueue();

// Force sync immediately (e.g., after re-login when previous mutations failed due to auth)
await flushMutations();
```

### Background sync

If `backgroundSync: true` (and using cookie auth), the SW registers a `SyncManager` event. Queued mutations sync even after the user closes the tab:

```ts
import { syncWhenPossible } from "./swoff/mutation/sync";

// Queue with background sync registration
await syncWhenPossible({
  method: "POST",
  url: "/api/notes",
  body: { title: "New Note" },
  tags: ["notes"],
});

// In unsupported browsers, falls back to `online` event listener
```

### Mutation state tracking (for UI)

```ts
import { getQueueItems } from "./swoff/mutation/queue";

// Listen for queue changes
window.addEventListener("mutation-queue-changed", async () => {
  const items = await getQueueItems();
  updateUI(items);
});

// Listen for sync progress
window.addEventListener("mutation-sync-progress", (e) => {
  const { succeeded, failed, total } = e.detail;
  // Update progress bar
});
```

## Config

```json
{
  "features": {
    "mutationQueue": {
      "enabled": true,
      "batchSize": 1,
      "batchDelayMs": 0,
      "backgroundSync": false,
      "retry": {
        "maxRetries": 5,
        "backoffMs": 1000,
        "maxBackoffMs": 30000,
        "jitterMs": 250
      }
    }
  }
}
```

- `batchSize` — emit progress event every N mutations
- `batchDelayMs` — delay between individual mutation replays (rate limiting)
- `retry.maxRetries` — max replay attempts before dropping
- `retry.backoffMs` — initial backoff delay
- `retry.maxBackoffMs` — max backoff cap
- `retry.jitterMs` — random jitter added to backoff to prevent thundering herd

### Auth compatibility

| Auth type | Mutation queue | Background sync |
| --------- | -------------- | --------------- |
| cookie    | ✅             | ✅              |
| bearer    | ✅             | ❌              |
| custom    | ✅             | ❌              |

Background sync runs from the SW with no DOM access — bearer tokens can't be refreshed and headers can't be injected, so it requires cookie auth where the browser sends the session cookie automatically.

## Related

- [Full comparison: Offline queue](../comparisons/offline-queue.md)
- [Auth guide: cookie vs bearer](./04-auth.md)
- [Config reference: mutationQueue](../CONFIG.md#featuresmutationqueue)
