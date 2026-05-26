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
 *   sw-progress           - Download progress (detail: { percent, downloaded, total })
 *   sw-ready              - SW active and controlling page
 *   sw-error              - SW registration failed
 *   cache-invalidated     - Cache entries cleared (detail: { tags })
 *   mutation-sync-complete - Queued mutations synced (detail: { succeeded, failed })
 *   mutation-queue-changed - Queue modified
 *
 * Window events (dispatched by feature modules):
 *   pwa-installable       - PWA can be installed (detail: { isInstallable: true })
 *   pwa-installed         - User accepted install (detail: { outcome: 'accepted' })
 *   sw-auth-unauthorized  - 401 response received
 *   sw-auth-state-change  - Login or logout (detail: { authenticated: boolean })
 *   mutation-rollback     - Mutation exhausted retries
 *   sw-update-available   - New version ready (detail: { version })
 *   sw-version-detected   - Version info available
 */
import { setupPwaInstall } from "./pwa/install.ts";
import { processMutationQueue } from "./mutation-queue.ts";
import { initServiceWorker as swInit } from "./sw/injector.ts";

setupPwaInstall();

// --- Mutation Queue Online Listener ---
window.addEventListener("online", processMutationQueue);

// --- SW Message Listener ---
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data.type === "SW_PROGRESS") {
      const { percent, downloaded, total } = event.data;
      window.dispatchEvent(
        new CustomEvent("sw-progress", {
          detail: { percent, downloaded, total },
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
    if (event.data.type === "TAG_INVALIDATED" && event.data.tag) {
      window.dispatchEvent(
        new CustomEvent("cache-invalidated", {
          detail: { tags: [event.data.tag] },
        })
      );
    }
  });
}

/** Initialize SW registration and all client-side features (PWA install, mutation queue, cross-tab sync). Call once at app startup. */
export async function initServiceWorker(): Promise<void>{
  await swInit();
}
