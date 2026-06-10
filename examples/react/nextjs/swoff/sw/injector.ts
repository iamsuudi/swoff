import { SW_VERSION } from "../sw-version.ts";
/**
 * Swoff SW Injector
 * Registers the service worker and tracks installation progress.
 *
 * Usage:
 *   import { initServiceWorker } from './swoff/sw/injector.ts';
 *   initServiceWorker();
 *
 * Window events:
 *   sw-progress          - Download progress (detail: { percent, downloaded, total })
 *   sw-ready             - SW active and controlling page
 *   sw-error             - SW registration failed
 */
const AUTO_ACTIVATE = false;

async function waitForController(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (navigator.serviceWorker.controller) {
      resolve();
    } else {
      const timeout = setTimeout(() => resolve(), 30000);
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
    }
  });
}

/** Register the SW. On update, the browser handles the lifecycle natively — no version.json or consent needed. */
export async function initServiceWorker(): Promise<void> {
  const dbg = (msg: string) => console.log("[SW][initServiceWorker]", msg, Date.now());

  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return;
  }

  dbg("entering online=" + navigator.onLine + " controller=" + (navigator.serviceWorker.controller ? "present" : "absent"));
  dbg("BEFORE register() call for /sw-v" + SW_VERSION + ".js");

  try {
    const regPromise = navigator.serviceWorker.register(`/sw-v${SW_VERSION}.js`);
    dbg("register() returned promise, awaiting...");

    // Timeout the register to detect hang
    const timeout = new Promise<ServiceWorkerRegistration>((_, reject) =>
      setTimeout(() => reject(new Error("REGISTER_TIMEOUT")), 5000)
    );
    const registration = await Promise.race([regPromise, timeout]);
    regPromise.catch(() => {}); // suppress unhandled rejection
    dbg("register() RESOLVED");

    if (registration.installing) {
      const installingWorker = registration.installing;
      dbg("SW installing, state=" + installingWorker.state);
      installingWorker.addEventListener("statechange", () => {
        dbg("statechange: " + installingWorker.state);
        if (installingWorker.state === "installed") {
          if (AUTO_ACTIVATE) {
            registration.waiting?.postMessage({ type: "SKIP_WAITING" });
          }
          window.dispatchEvent(new CustomEvent("sw-ready"));
        }
      });
    } else {
      dbg("registration.installing is null, waiting=" + (registration.waiting ? "present" : "absent") + " active=" + (registration.active ? "present" : "absent"));
    }

    dbg("before waitForController()");
    await waitForController();
    dbg("AFTER waitForController()");
    window.dispatchEvent(new CustomEvent("sw-ready"));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    dbg("CATCH: " + msg);
    if (msg === "REGISTER_TIMEOUT") {
      dbg("register() TIMED OUT after 5s");
      // Check if SW became active despite timeout
      if (navigator.serviceWorker.controller) {
        dbg("controller present despite timeout, dispatching ready");
        window.dispatchEvent(new CustomEvent("sw-ready"));
        return;
      }
    }
    console.error("Service Worker registration failed:", error);
    window.swError = true;
    window.dispatchEvent(new CustomEvent("sw-error"));
  }
}

/** Activate a waiting SW without reloading. Useful when you handle the transition yourself. */
export async function skipWaiting(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}
