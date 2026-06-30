import type { RuntimeContext } from "./utils.js";
import { T, R } from "./utils.js";

export function generateSwInjectorCode(
  ctx: RuntimeContext & { autoActivate: boolean; swFilename: string },
): string {
  const { ext, ts, autoActivate, swFilename } = ctx;

  return `/**
 * Swoff SW Injector
 * Registers the service worker.
 *
 * Usage:
 *   import { initServiceWorker } from './swoff/sw/injector.${ext}';
 *   initServiceWorker();
 *
 * Window events:
 *   sw-progress          - Download progress (detail: { percent, downloaded, total })
 */
const AUTO_ACTIVATE = ${autoActivate};

async function waitForController()${R(ts, "Promise<void>")}{
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
export async function initServiceWorker()${R(ts, "Promise<void>")}{
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/${swFilename}.js");

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
export async function skipWaiting()${R(ts, "Promise<void>")}{
  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}
`;
}
