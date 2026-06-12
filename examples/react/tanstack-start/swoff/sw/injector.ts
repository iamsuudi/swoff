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
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");

    if (registration.installing) {
      const installingWorker = registration.installing;
      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state === "installed") {
          if (AUTO_ACTIVATE) {
            registration.waiting?.postMessage({ type: "SKIP_WAITING" });
          }
          window.dispatchEvent(new CustomEvent("sw-ready"));
        }
      });
    }

    await waitForController();
    window.dispatchEvent(new CustomEvent("sw-ready"));
  } catch (error) {
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
