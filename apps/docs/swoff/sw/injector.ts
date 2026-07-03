/**
 * Swoff SW Injector
 * Registers the service worker.
 *
 * Usage:
 *   import { initServiceWorker } from './swoff/sw/injector.ts';
 *   initServiceWorker();
 *
 * Window events:
 *   sw-progress          - Download progress (detail: { percent, downloaded, total })
 */
const AUTO_ACTIVATE = true;

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

/** Register the SW. The browser detects updates by comparing SW file bytes. */
export async function initServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");

    if (registration.installing) {
      registration.installing.addEventListener("statechange", () => {
        if (registration.installing?.state === "installed" && AUTO_ACTIVATE) {
          registration.waiting?.postMessage({ type: "SKIP_WAITING" });
        }
      });
    }

    await waitForController();
  } catch (error) {
    console.error("Service Worker registration failed:", error);
  }
}

/** Activate a waiting SW without reloading. Useful when you handle the transition yourself. */
export async function skipWaiting(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}
