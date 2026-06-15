import type { RuntimeContext } from "./utils.js";
import { T, R } from "./utils.js";

export function generateSwInjectorCode(
  ctx: RuntimeContext & { autoActivate: boolean; swFilename: string; versionMode: "hash" | "package" | "manual" },
): string {
  const { ext, ts, autoActivate, swFilename, versionMode } = ctx;
  const isHash = versionMode === "hash";
  const swUrl = isHash
    ? `"/${swFilename}.js"`
    : `\`/${swFilename}-v\${SW_VERSION}.js\``;

  return `${
    isHash
      ? ""
      : `import { SW_VERSION } from "../sw-version.${ext}";\n`
  }/**
 * Swoff SW Injector
 * Registers the service worker and tracks installation progress.
 *
 * Usage:
 *   import { initServiceWorker } from './swoff/sw/injector.${ext}';
 *   initServiceWorker();
 *
 * Window events:
 *   sw-progress          - Download progress (detail: { percent, downloaded, total })
 *   sw-ready             - SW active and controlling page
 *   sw-error             - SW registration failed
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

/** Register the SW. On update, the browser handles the lifecycle natively — no version.json or consent needed. */
export async function initServiceWorker()${R(ts, "Promise<void>")}{
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(${swUrl});

    var swReadyDispatched = false;
    if (registration.installing) {
      const installingWorker = registration.installing;
      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state === "installed") {
          if (AUTO_ACTIVATE) {
            registration.waiting?.postMessage({ type: "SKIP_WAITING" });
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

/** Activate a waiting SW without reloading. Useful when you handle the transition yourself. */
export async function skipWaiting()${R(ts, "Promise<void>")}{
  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}
`;
}
