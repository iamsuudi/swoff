import type { RuntimeContext } from "./utils.js";

export function generateClientInjectorBundleCode(
  ctx: RuntimeContext,
  autoActivate: boolean,
  swFilename: string,
  pwaEnabled: boolean,
  navMode?: string,
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
  // Guards against missing prefetchCache — only active when the user includes the fetch/core module.
  if (typeof history !== "undefined") {
    var origPushState = history.pushState.bind(history);
    history.pushState = function (data, unused, url) {
      origPushState(data, unused, url);
      if (typeof url === "string" && url.startsWith("/") && typeof prefetchCache === "function") {
        prefetchCache(url);
      }
    };
    var origReplaceState = history.replaceState.bind(history);
    history.replaceState = function (data, unused, url) {
      origReplaceState(data, unused, url);
      if (typeof url === "string" && url.startsWith("/") && typeof prefetchCache === "function") {
        prefetchCache(url);
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
      var registration = await navigator.serviceWorker.register("/${swFilename}.js");
      var swReadyDispatched = false;
      if (registration.installing) {
        var installingWorker = registration.installing;
        installingWorker.addEventListener("statechange", function () {
          if (installingWorker.state === "installed") {
            if (AUTO_ACTIVATE) {
              if (registration.waiting) {
                registration.waiting.postMessage({ type: "SKIP_WAITING" });
              }
            }
            swReadyDispatched = true;
            window.dispatchEvent(new CustomEvent("sw-ready"));
          }
        });
      }
      await waitForController();
      if (!swReadyDispatched) {
        window.dispatchEvent(new CustomEvent("sw-ready"));
      }
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      window.swError = true;
      window.dispatchEvent(new CustomEvent("sw-error"));
    }
  }

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
  }

  // ── Focus Listener (reactive strategy) ──
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "FOCUS" });
      }
    });
  }
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
    });
  }

  // ── Main Entry ──
  async function initServiceWorker() {
    await registerSW();
    var storage = await getStorageEstimate();
    if (storage.percentUsed > 80) {
      window.dispatchEvent(new CustomEvent("swoff:notification", {
        detail: {
          level: "warn",
          code: "STORAGE_QUOTA_HIGH",
          message: "Storage at " + storage.percentUsed + "% capacity (" + formatBytes(storage.usage) + " / " + formatBytes(storage.quota) + ")",
        },
      }));
    }
  }

  // ── Auto-initialize ──
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    initServiceWorker().catch(function (err) {
      console.warn("Swoff SW registration failed:", err);
    });
  }
})();
`;
}
