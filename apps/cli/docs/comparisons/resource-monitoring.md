# Resource Monitoring: Swoff vs Manual Handling

Resource monitoring covers two related concerns that affect offline-first apps: **network fetch timeout** (preventing stalled requests from blocking cache fallbacks) and **storage quota awareness** (notifying users before the browser evicts cached data). Most libraries treat these as unrelated problems, but both are about the app gracefully handling resource constraints — network bandwidth and disk quota — that are inherent to the browser environment.

## How Swoff does it

Swoff addresses both concerns through a single notification channel that originates in the Service Worker and surfaces as a `swoff:notification` CustomEvent on the window.

### Network fetch timeout

Every network request made by the SW passes through `_fetchWithTimeout()`, which wraps `fetch()` with an `AbortController` configured to `features.serviceWorker.strategy.timeout` seconds (default 10):

```ts
async function _fetchWithTimeout(request) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch {
    // Broadcast notification, let strategy fall through to cache
  }
}
```

On timeout or network error:

1. `SW_NOTIFICATION` (`FETCH_FAILED`) is broadcast to all connected clients
2. The calling strategy (cache-first, network-first, etc.) naturally falls through to its cache fallback — no request is dropped

This timeout applies uniformly across all 6 caching strategies and both `_fetch` variants (plain and navigation-preload).

### Storage quota awareness

`notification.ts` exports three utilities:

| Function               | Purpose                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `getStorageEstimate()` | Wraps `navigator.storage.estimate()` — returns raw `{ usage, quota, percentUsed }` for custom UI               |
| `checkStorage()`       | Same as above, but dispatches `swoff:notification` at >80% usage (code: `STORAGE_QUOTA_HIGH`, level: `"warn"`) |
| `formatBytes(n)`       | Formats byte counts for display (`1572864` → `"1.5 MB"`)                                                       |

The React adapter `useStorageEstimate()` ties these together as a reactive hook that refreshes on visibility change.

### Unified notification channel

All resource events — fetch failures, precache failures, background sync errors, storage quota warnings — are broadcast through a single `swoff:notification` event with a `code` discriminator:

```ts
window.addEventListener("swoff:notification", (event) => {
  const { level, code, message } = event.detail;
  if (level === "error") myToast.error(message);
  if (level === "warn") myToast.warn(message);
});
```

This keeps the listener surface small while remaining extensible — new codes can be added without changing the API contract.

## How competitors handle it

**TanStack Query / SWR:** No SW-level fetch timeout. The `queryFn` can throw on timeout (manually via `AbortSignal`), but there is no built-in mechanism, no uniform timeout across queries, and no notification channel for storage pressure. Storage estimation is entirely the developer's responsibility.

**Workbox:** Provides a `NetworkTimeoutSeconds` option for individual strategies (e.g., `NetworkFirst`), but it's per-strategy, not global. No storage quota monitoring. No notification channel — errors are logged to the SW console, not surfaced to the window. The `broadcastUpdate` plugin only broadcasts `CACHE_UPDATED` events, not errors or warnings.

**Client DBs (RxDB, TanStack DB, ElectricSQL):** No fetch timeout — they are not SW tools and don't intercept `fetch`. Storage management is handled by the local database engine (SQLite WASM, IndexedDB), which reports its own quota errors. No unified notification channel for resource events.

**Vite-plugin-pwa:** Wraps Workbox. Inherits the same limitations — per-strategy timeout at best, no storage monitoring, no error notification channel.

## Comparison table

| Feature                                   | Swoff                                        | TanStack Query / SWR | Workbox              | Client DBs                          |
| ----------------------------------------- | -------------------------------------------- | -------------------- | -------------------- | ----------------------------------- |
| **SW-level fetch timeout**                | ✅ Global, all strategies                    | ❌ No SW timeout     | 🟡 Per-strategy only | ❌ Not applicable                   |
| **Timeout on navigation preload**         | ✅ `fetchWithPreload` wraps timeout          | ❌ Not applicable    | ❌ Not applicable    | ❌ Not applicable                   |
| **Timeout broadcasts to window**          | ✅ `SW_NOTIFICATION`                         | ❌                   | ❌                   | ❌                                  |
| **Storage quota monitoring**              | ✅ `checkStorage()` + `getStorageEstimate()` | ❌ Not provided      | ❌ Not provided      | 🟡 DB engine reports its own errors |
| **Quota notification at threshold**       | ✅ CustomEvent at >80%                       | ❌                   | ❌                   | ❌                                  |
| **Format bytes utility**                  | ✅ `formatBytes()`                           | ❌                   | ❌                   | ❌                                  |
| **Unified notification channel**          | ✅ Single `swoff:notification` event         | ❌                   | ❌                   | ❌                                  |
| **Precache failure notifications**        | ✅ `PRECACHE_FAILED` per-asset               | ❌ Not applicable    | ❌                   | ❌ Not applicable                   |
| **Background sync failure notifications** | ✅ `BACKGROUND_SYNC_FAILED`                  | ❌ Not applicable    | ❌                   | ❌ Not applicable                   |
| **Auto-clear on logout**                  | ✅ Notification + `clearAuth()`              | ❌                   | ❌                   | ❌ Data persists                    |
