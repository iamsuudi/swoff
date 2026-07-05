import type { RuntimeContext } from "./utils.js";

export function generateClientInjectorBundleCode(
  ctx: RuntimeContext,
  autoActivate: boolean,
  swFilename: string,
  swUrl: string | undefined,
  pwaEnabled: boolean,
  navMode?: string,
  authEnabled?: boolean,
  mutationQueueEnabled?: boolean,
  connectivityEnabled?: boolean,
  tagInvalidationEnabled?: boolean,
  storageThreshold?: number,
): string {
  const pwaCode = pwaEnabled ? `
  // ── PWA Install Prompt ──
  function setupPwaInstall() {
    window.addEventListener("beforeinstallprompt", function (e) {
      window.deferredInstallPrompt = e;
      window.pwaInstallable = true;
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("pwa-installable", { detail: { isInstallable: true } }));
    });
    window.addEventListener("appinstalled", function () {
      window.deferredInstallPrompt = null;
      window.pwaInstallable = false;
      window.dispatchEvent(new CustomEvent("pwa-installed", { detail: { outcome: "accepted" } }));
    });
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") { setupPwaInstall(); }` : "";

  const ssrPrefetch = navMode === "ssr" ? `
  // ── Auto-prefetch HTML on client-side navigation (SSR mode) ──
  if (typeof history !== "undefined") {
    var origPushState = history.pushState.bind(history);
    history.pushState = function (data, unused, url) {
      origPushState(data, unused, url);
      if (typeof url === "string" && url.startsWith("/")) {
        fetch(new Request(url)).catch(function() {});
      }
    };
    var origReplaceState = history.replaceState.bind(history);
    history.replaceState = function (data, unused, url) {
      origReplaceState(data, unused, url);
      if (typeof url === "string" && url.startsWith("/")) {
        fetch(new Request(url)).catch(function() {});
      }
    };
  }` : "";

  return `(function () {
  "use strict";

  // ── Service Worker Registration ──
  var AUTO_ACTIVATE = ${autoActivate};

  function waitForController() {
    return new Promise(function (resolve) {
      if (navigator.serviceWorker.controller) {
        resolve();
      } else {
        var timeout = setTimeout(function () { resolve(); }, 30000);
        navigator.serviceWorker.addEventListener("controllerchange", function () {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
      }
    });
  }

  async function registerSW() {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service Workers not supported");
      return;
    }
    try {
      var registration = await navigator.serviceWorker.register("${swUrl || '/' + swFilename + '.js'}");
      if (registration.installing) {
        registration.installing.addEventListener("statechange", function () {
          if (registration.installing?.state === "installed" && AUTO_ACTIVATE) {
            if (registration.waiting) {
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }
          }
        });
      }
      await waitForController();
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }

${connectivityEnabled ? `
  // ── Connectivity ──
  var CONNECTIVITY_EVENT = "app-connectivity-change";
  var heartbeatIntervalId = null;
  var HEARTBEAT_DELAY = 30000;
  var _currentOnlineStatus = typeof navigator !== "undefined" ? navigator.onLine : true;

  function getCurrentOnlineStatus() {
    return _currentOnlineStatus;
  }

  function createTimeoutSignal(ms) {
    if (typeof AbortSignal.timeout === "function") return AbortSignal.timeout(ms);
    var ctrl = new AbortController();
    setTimeout(function () { ctrl.abort(); }, ms);
    return ctrl.signal;
  }

  async function verifyAndNotify() {
    if (typeof window === "undefined") return false;
    if (!navigator.onLine) {
      dispatchState(false);
      return false;
    }
    try {
      await fetch("/" + Date.now() + "?hb=1", {
        method: "HEAD",
        cache: "no-cache",
        signal: createTimeoutSignal(5000),
      });
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "ONLINE" });
      }
      dispatchState(true);
      return true;
    } catch (error) {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "OFFLINE" });
      }
      dispatchState(false);
      return false;
    }
  }

  function dispatchState(isTrulyOnline) {
    _currentOnlineStatus = isTrulyOnline;
    window.dispatchEvent(new CustomEvent(CONNECTIVITY_EVENT, { detail: { online: isTrulyOnline } }));
  }

  function startHeartbeat() {
    if (heartbeatIntervalId) return;
    heartbeatIntervalId = setInterval(async function () {
      if (document.hidden) return;
      await verifyAndNotify();
    }, HEARTBEAT_DELAY);
  }

  function stopHeartbeat() {
    if (!heartbeatIntervalId) return;
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
  }

  function forceRetry() {
    stopHeartbeat();
    return verifyAndNotify().then(function () {
      startHeartbeat();
    });
  }

  // ── Storage ──
  async function getStorageEstimate() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { usage: 0, quota: 0, percentUsed: 0 };
    }
    var est = await navigator.storage.estimate();
    var usage = est.usage || 0;
    var quota = est.quota || 0;
    var percentUsed = quota > 0 ? Math.round((usage / quota) * 100) : 0;
    return { usage: usage, quota: quota, percentUsed: percentUsed };
  }

  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    var units = ["B", "KB", "MB", "GB"];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + " " + units[i];
  }

  // ── Online / Offline / Visibility Listeners ──
  if (typeof window !== "undefined") {
    window.addEventListener("online", async function () {
      await verifyAndNotify();
      startHeartbeat();
    });

    window.addEventListener("offline", function () {
      stopHeartbeat();
      dispatchState(false);
    });

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        verifyAndNotify();
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    });

    if (navigator.onLine) {
      verifyAndNotify();
      startHeartbeat();
    } else {
      queueMicrotask(function () { dispatchState(false); });
    }
  }` : ""}
${tagInvalidationEnabled ? `
  // ── Focus Listener (reactive strategy) ──
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "FOCUS" });
      }
    });
  }` : ""}
${pwaCode}${ssrPrefetch}
  // ── SW Message Listener ──
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", function (event) {
      if (event.data.type === "CACHE_UPDATED") {
        window.dispatchEvent(new CustomEvent("swoff:cache-updated", { detail: { url: event.data.url } }));
      }
      if (event.data.type === "NAV_RETRY_SUCCESS") {
        window.dispatchEvent(new CustomEvent("swoff:navigation-online", { detail: { url: event.data.url } }));
      }
      if (event.data.type === "OFFLINE_FALLBACK_ACTIVATED") {
        window.dispatchEvent(new CustomEvent("swoff:offline-fallback", { detail: event.data.detail }));
      }
      if (event.data.type === "SW_PROGRESS") {
        window.dispatchEvent(new CustomEvent("sw-progress", {
          detail: { percent: event.data.percent, downloaded: event.data.downloaded, total: event.data.total },
        }));
      }
      if (event.data.type === "SW_NOTIFICATION") {
        window.dispatchEvent(new CustomEvent("swoff:notification", {
          detail: { level: event.data.level, code: event.data.code, message: event.data.message },
        }));
      }
${mutationQueueEnabled ? `
      if (event.data.type === "BACKGROUND_SYNC_PROGRESS") {
        window.dispatchEvent(new CustomEvent("mutation-sync-progress", { detail: event.data.detail }));
      }
      if (event.data.type === "BACKGROUND_SYNC_COMPLETE") {
        var _d = event.data.detail;
        window.dispatchEvent(new CustomEvent("mutation-sync-complete", { detail: { succeeded: _d.succeeded, failed: _d.failed } }));
        if (_d.tags && _d.tags.length > 0) {
          window.dispatchEvent(new CustomEvent("cache-invalidated", { detail: { tags: _d.tags } }));
        }
        window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
      }
      if (event.data.type === "MUTATION_STORED" && window.swoff && typeof window.swoff.flushMutations === "function") {
        window.swoff.flushMutations();
      }` : ""}
${authEnabled ? `
      if (event.data.type === "AUTH_CLEARED" && window.swoff && typeof window.swoff.clearMemoryAuth === "function") {
        window.swoff.clearMemoryAuth();
        window.dispatchEvent(new CustomEvent("sw-auth-state-change", { detail: { type: "clear" } }));
      }
      if (event.data.type === "AUTH_FAILURE" && window.swoff && typeof window.swoff.ensureValidAuth === "function") {
        (async function () {
          var _refreshed = await window.swoff.ensureValidAuth();
          if (!_refreshed) {
            if (window.swoff && typeof window.swoff.clearQueue === "function") {
              await window.swoff.clearQueue();
            }
            try {
              var _names = ["swoff-runtime", "swoff-runtime-html"];
              for (var _i = 0; _i < _names.length; _i++) {
                var _cache = await caches.open(_names[_i]);
                var _keys = await _cache.keys();
                await Promise.all(_keys.map(function (k) { return _cache.delete(k); }));
              }
            } catch (e) {}
            window.dispatchEvent(new CustomEvent("sw-auth-unauthorized"));
          }
        })();
      }` : ""}
${tagInvalidationEnabled ? `
      if (event.data.type === "TAG_INVALIDATED" && event.data.tag) {
        window.dispatchEvent(new CustomEvent("cache-invalidated", {
          detail: { tags: [event.data.tag] },
        }));
      }` : ""}
    });
  }

  // ── Main Entry ──
  async function initServiceWorker() {
    await registerSW();
${connectivityEnabled ? `
    var storage = await getStorageEstimate();
    if (storage.percentUsed > ${storageThreshold ?? 80}) {
      window.dispatchEvent(new CustomEvent("swoff:notification", {
        detail: {
          level: "warn",
          code: "STORAGE_QUOTA_HIGH",
          message: "Storage at " + storage.percentUsed + "% capacity (" + formatBytes(storage.usage) + " / " + formatBytes(storage.quota) + ")",
        },
      }));
    }` : ""}
  }

${connectivityEnabled ? `
  // ── Bridge for swoff-api-bundle ──
  if (typeof window !== "undefined") {
    window.__SWOFF_FORCE_RETRY = forceRetry;
  }` : ""}

  // ── Auto-initialize ──
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    initServiceWorker().catch(function (err) {
      console.warn("Swoff SW registration failed:", err);
    });
  }
})();
`;
}
