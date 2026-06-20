import type { RuntimeContext } from "./utils.js";

export function generateClientInjectorCode(
  ctx: RuntimeContext,
  pwaEnabled: boolean,
  mutationQueueEnabled: boolean,
  serverPushEnabled: boolean,
  navMode?: string,
  authEnabled?: boolean,
): string {
  const { ext, ts } = ctx;

  const pwaImport = pwaEnabled
    ? `import { setupPwaInstall } from "./pwa/prompt.${ext}";
`
    : "";

  const pwaCall = pwaEnabled
    ? `if (typeof window !== "undefined" && typeof document !== "undefined") { setupPwaInstall(); }\n`
    : "";

  const pushImport = serverPushEnabled
    ? `import { startPushEvents } from "./server-push/client.${ext}";
`
    : "";

  const pushCall = serverPushEnabled
    ? `if (typeof navigator !== "undefined" && "serviceWorker" in navigator) { startPushEvents(); }\n`
    : "";

  const mutationImport = mutationQueueEnabled
    ? `import { processMutationQueue, clearQueue } from "./mutation/queue.${ext}";
`
    : "";

  const authImport = authEnabled
    ? `import { ensureValidAuth, clearMemoryAuth } from "./auth/store.${ext}";
`
    : "";

  const storageImport = `import { getStorageEstimate, formatBytes } from "./storage.${ext}";
`;

  const onlineListener = `
// --- Online Listener ---
// When connectivity returns, the SW checks stale cache entries and refetches them.
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    const isOnline = await verifyAndNotify()
    startHeartbeat()
    if (isOnline) {
      ${mutationQueueEnabled ? `processMutationQueue()` : ""}
    }
  })

  window.addEventListener('offline', () => {
    stopHeartbeat()
    dispatchState(false)
  })

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      verifyAndNotify()
      startHeartbeat()
    } else {
      stopHeartbeat()
    }
  })

  if (navigator.onLine) {
    verifyAndNotify()
    startHeartbeat()
  } else {
    queueMicrotask(() => dispatchState(false))
  }
}
`;

  const focusListener = `
// --- Focus Listener for Reactive Strategy ---
// Notifies the SW when the tab gains focus so it can refresh stale reactive entries.
// Uses visibilitychange only (covers tab switch, window refocus, alt-tab) — single source avoids duplicate FOCUS messages.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "FOCUS" });
    }
  });
}
`;

  const invalidationHandler = `
    if (event.data.type === "TAG_INVALIDATED" && event.data.tag) {
      window.dispatchEvent(
        new CustomEvent("cache-invalidated", {
          detail: { tags: [event.data.tag] },
        })
      );
    }
`;

  const swImport = `import { initServiceWorker as swInit } from "./sw/injector.${ext}";
`;

  const autoPrefetchImport =
    navMode === "ssr"
      ? `import { prefetchCache } from "./fetch/core.${ext}";
`
      : "";

  const autoPrefetchCode =
    navMode === "ssr"
      ? `
// --- Auto-prefetch HTML on client-side navigation (SSR mode) ---
// Intercepts history.pushState/replaceState to warm the SW cache with HTML
// for routes the user navigates to via client-side routing.
if (typeof history !== "undefined") {
  const origPushState = history.pushState.bind(history);
  history.pushState = function (data, unused, url) {
    origPushState(data, unused, url);
    if (typeof url === "string" && url.startsWith("/")) {
      prefetchCache(url);
    }
  };
  const origReplaceState = history.replaceState.bind(history);
  history.replaceState = function (data, unused, url) {
    origReplaceState(data, unused, url);
    if (typeof url === "string" && url.startsWith("/")) {
      prefetchCache(url);
    }
  };
}
`
      : "";

  return `/**
 * Swoff Client Injector
 * Orchestrates SW registration, PWA install, and cross-tab sync.
 * Single entry point for all Swoff client-side features.
 *
 * Usage:
 *   import { initServiceWorker } from './swoff/client-injector.${ext}';
 *   initServiceWorker();
 *
 * Window events (dispatched by this module):
 *   sw-progress              - Download progress (detail: { percent, downloaded, total })
 *   sw-ready                 - SW active and controlling page
 *   sw-error                 - SW registration failed
 *   cache-invalidated        - Cache entries cleared on SW confirmation (detail: { tags })
 *   swoff:cache-updated         - Background refresh completed (detail: { url })
 *   swoff:offline-fallback      - Offline fallback page served (detail: { route, fallbackLevel, timestamp })
 *   swoff:notification       - SW or storage notification (detail: { level, code, message })
 *   mutation-sync-complete   - Queued mutations synced (detail: { succeeded, failed })
 *   mutation-sync-progress   - Batch progress during sync (detail: { succeeded, failed, total, current })
 *   mutation-queue-changed   - Queue modified
 *
 * Window events (dispatched by feature modules):
 *   pwa-installable       - PWA can be installed (detail: { isInstallable: true })
 *   pwa-installed         - User accepted install (detail: { outcome: 'accepted' })
 *   sw-auth-unauthorized  - 401 response received
 *   sw-auth-state-change  - Login or logout (detail: { authenticated: boolean })
 */
${pwaImport}${mutationImport}${authImport}${swImport}${storageImport}${pushImport}${autoPrefetchImport}
import {
  dispatchState,
  startHeartbeat,
  stopHeartbeat,
  verifyAndNotify,
} from './connectivity.${ext}'

${pwaCall}${pushCall}${onlineListener}${focusListener}${autoPrefetchCode}
// --- SW Message Listener ---
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data.type === "CACHE_UPDATED") {
      window.dispatchEvent(
        new CustomEvent("swoff:cache-updated", {
          detail: { url: event.data.url },
        })
      );
    }
    if (event.data.type === "NAV_RETRY_SUCCESS") {
      window.dispatchEvent(
        new CustomEvent("swoff:navigation-online", {
          detail: { url: event.data.url },
        })
      );
    }
    if (event.data.type === "OFFLINE_FALLBACK_ACTIVATED") {
      window.dispatchEvent(
        new CustomEvent("swoff:offline-fallback", {
          detail: event.data.detail,
        })
      );
    }
    if (event.data.type === "SW_PROGRESS") {
      const { percent, downloaded, total } = event.data;
      window.dispatchEvent(
        new CustomEvent("sw-progress", {
          detail: { percent, downloaded, total },
        })
      );
    }
    if (event.data.type === "SW_NOTIFICATION") {
      window.dispatchEvent(
        new CustomEvent("swoff:notification", {
          detail: {
            level: event.data.level,
            code: event.data.code,
            message: event.data.message,
          },
        })
      );
    }
    if (event.data.type === "BACKGROUND_SYNC_PROGRESS") {
      window.dispatchEvent(
        new CustomEvent("mutation-sync-progress", {
          detail: event.data.detail,
        })
      );
    }
    if (event.data.type === "BACKGROUND_SYNC_COMPLETE") {
      const { succeeded, failed, tags } = event.data.detail;
      window.dispatchEvent(
        new CustomEvent("mutation-sync-complete", {
          detail: { succeeded, failed },
        })
      );
      if (tags && tags.length > 0) {
        window.dispatchEvent(
          new CustomEvent("cache-invalidated", { detail: { tags } })
        );
      }
      window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
    }
    if (event.data.type === "MUTATION_STORED" && typeof processMutationQueue !== "undefined") {
      processMutationQueue();
    }
    if (event.data.type === "AUTH_CLEARED") {
      // Another tab cleared auth — clear memory only (IndexedDB + caches already cleaned by initiator)
      if (typeof clearMemoryAuth !== "undefined") {
        clearMemoryAuth();
      }
      window.dispatchEvent(new CustomEvent("sw-auth-state-change", { detail: { type: "clear" } }));
    }
    if (event.data.type === "AUTH_FAILURE") {
      // SW detected 401 during background refetch — check if session is still valid
      (async () => {
        if (typeof ensureValidAuth === "undefined") return;
        const refreshed = await ensureValidAuth();
        if (!refreshed) {
          // Session expired — clear queue and runtime caches
          if (typeof clearQueue !== "undefined") {
            await clearQueue();
          }
          try {
            for (const name of ["swoff-runtime", "swoff-runtime-html"]) {
              const cache = await caches.open(name);
              const keys = await cache.keys();
              await Promise.all(keys.map((k) => cache.delete(k)));
            }
          } catch {
            // Handle cache deletion errors
          }
          window.dispatchEvent(new CustomEvent("sw-auth-unauthorized"));
        }
      })();
    }${invalidationHandler}  });
}

/** Initialize SW registration and all client-side features (PWA install, mutation queue, cross-tab sync). Call once at app startup. */
export async function initServiceWorker()${ts ? ": Promise<void>" : " "}{
  await swInit();
  const storage = await getStorageEstimate();
  if (storage.percentUsed > 80) {
    window.dispatchEvent(
      new CustomEvent("swoff:notification", {
        detail: {
          level: "warn",
          code: "STORAGE_QUOTA_HIGH",
          message: \`Storage at \${storage.percentUsed}% capacity (\${formatBytes(storage.usage)} / \${formatBytes(storage.quota)})\`,
        },
      }),
    );
  }
}
`;
}
