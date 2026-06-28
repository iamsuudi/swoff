/**
 * Swoff Client Injector
 * Orchestrates SW registration, PWA install, and cross-tab sync.
 * Single entry point for all Swoff client-side features.
 *
 * Usage:
 *   import { initServiceWorker } from './swoff/client-injector.ts';
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
import { initServiceWorker as swInit } from "./sw/injector.ts";


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
    }  });
}

// --- Background Precache Resume ---
// Tells the SW to resume background precaching when the page becomes visible
// or the browser comes back online. The SW tracks progress via IndexedDB
// checkpoint so it safely picks up where it left off.
if (typeof document !== "undefined" && "serviceWorker" in navigator) {
  var _resumeP = function() {
    if (navigator.serviceWorker.controller)
      navigator.serviceWorker.controller.postMessage({ type: "RESUME_PRECACHE" });
  };
  document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") _resumeP();
  });
  window.addEventListener("online", _resumeP);
}

/** Initialize SW registration and all client-side features (PWA install, mutation queue, cross-tab sync). Call once at app startup. */
export async function initServiceWorker(): Promise<void>{
  await swInit();
}
