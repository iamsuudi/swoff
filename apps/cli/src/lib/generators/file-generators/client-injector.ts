/**
 * Generates client-injector.{js|ts} - orchestrator that wires feature modules together.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateClientInjector(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const pwaEnabled = ctx.config.features.pwa.enabled;
  const mutationQueueEnabled = ctx.config.features.mutationQueue.enabled;
  const crossTabSync = ctx.config.features.crossTabSync;

  const pwaImport = pwaEnabled
    ? `import { setupPwaInstall } from "./pwa/install.${ext}";
`
    : "";

  const pwaCall = pwaEnabled ? `setupPwaInstall();\n` : "";

  const mutationImport = mutationQueueEnabled
    ? `import { processMutationQueue } from "./mutation-queue.${ext}";
`
    : "";

  const mutationOnlineListener = mutationQueueEnabled
    ? `
// --- Mutation Queue Online Listener ---
window.addEventListener("online", processMutationQueue);
`
    : "";

  const onlineRefetchListener = `
// --- Online Refetch Listener ---
// When connectivity returns, the SW checks stale cache entries and refetches them.
window.addEventListener("online", () => {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "ONLINE" });
  }
});
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

  const crossTabHandler = crossTabSync
    ? `
    if (event.data.type === "TAG_INVALIDATED" && event.data.tag) {
      window.dispatchEvent(
        new CustomEvent("cache-invalidated", {
          detail: { tags: [event.data.tag] },
        })
      );
    }
`
    : "";

  const swImport = `import { initServiceWorker as swInit } from "./sw/injector.${ext}";
`;

  const code = `/**
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
 *   cache-invalidated        - Cache entries cleared (detail: { tags })
 *   swoff:cache-updated      - Background refresh completed (detail: { url })
 *   mutation-sync-complete   - Queued mutations synced (detail: { succeeded, failed })
 *   mutation-sync-progress   - Batch progress during sync (detail: { succeeded, failed, total, current })
 *   mutation-queue-changed   - Queue modified
 *
 * Window events (dispatched by feature modules):
 *   pwa-installable       - PWA can be installed (detail: { isInstallable: true })
 *   pwa-installed         - User accepted install (detail: { outcome: 'accepted' })
 *   sw-auth-unauthorized  - 401 response received
 *   sw-auth-state-change  - Login or logout (detail: { authenticated: boolean })
 *   sw-update-available   - New version ready (detail: { version })
 *   sw-version-detected   - Version info available
 */
${pwaImport}${mutationImport}${swImport}
${pwaCall}${mutationOnlineListener}${onlineRefetchListener}${focusListener}
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
    if (event.data.type === "SW_PROGRESS") {
      const { percent, downloaded, total } = event.data;
      window.dispatchEvent(
        new CustomEvent("sw-progress", {
          detail: { percent, downloaded, total },
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
    if (event.data.type === "MUTATION_STORED") {
      processMutationQueue();
    }${crossTabHandler}  });
}

/** Initialize SW registration and all client-side features (PWA install, mutation queue, cross-tab sync). Call once at app startup. */
export async function initServiceWorker()${ts ? ": Promise<void>" : " "}{
  await swInit();
}
`;

  writeFile(ctx, `client-injector.${ext}`, code);
}
