import type { RuntimeContext } from "./utils.js";
import { T, R } from "./utils.js";

export function generateSwInjectorCode(
  ctx: RuntimeContext & { autoUpdate: boolean; autoActivate: boolean; versionEnabled: boolean; swFilename: string },
): string {
  const { ext, ts, autoUpdate, autoActivate, versionEnabled, swFilename } = ctx;

  if (!versionEnabled) {
    return `/**
 * Swoff SW Injector (Simple Mode)
 * Fixed SW URL with hash-based cache name — no versioned URLs or update events.
 *
 * Usage:
 *   import { initServiceWorker } from './swoff/sw/injector.${ext}';
 *   initServiceWorker();
 *
 * Window events:
 *   sw-ready  - SW active and controlling page
 *   sw-error  - SW registration failed
 *
 * Window properties:
 *   window.currentSWVersion  - "simple"
 *   window.swReady           - SW is active
 *   window.swError           - Registration failed
 */
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

/** Register the SW with a fixed URL (non-versioned mode). Dispatches sw-ready/sw-error. */
export async function initServiceWorker()${R(ts, "Promise<void>")}{
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register("/${swFilename}.js");
    window.currentSWVersion = "simple";
    window.dispatchEvent(new CustomEvent("sw-version-detected"));
    await waitForController();
    window.dispatchEvent(new CustomEvent("sw-ready"));
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    window.swError = true;
    window.dispatchEvent(new CustomEvent("sw-error"));
  }
}
`;
  }

  return `/**
 * Swoff SW Injector
 * Framework-agnostic SW registration with versioned URLs and update flow.
 *
 * Usage:
 *   import { initServiceWorker } from './swoff/sw/injector.${ext}';
 *   initServiceWorker();
 *
 * Window events:
 *   sw-version-detected  - Version info available on window
 *   sw-update-available  - New version ready for user consent (detail: { version })
 *   sw-progress          - Download progress (detail: { percent, downloaded, total })
 *   sw-ready             - SW active and controlling page
 *   sw-error             - SW registration failed
 *
 * Window properties:
 *   window.latestSWVersion       - Latest version from version.json
 *   window.currentSWVersion      - Active SW version
 *   window.swAvailableVersion    - Pending update version
 *   window.swUpdateRequired      - Forced update needed (version < minSupportedVersion)
 *   window.swMinSupportedVersion - Minimum supported version
 *   window.swReady               - SW is active
 *   window.swError               - Registration failed
 */
const AUTO_UPDATE = ${autoUpdate};
const AUTO_ACTIVATE = ${autoActivate};

function semverCompare(a${T(ts, "string")}, b${T(ts, "string")})${R(ts, "number")}{
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

async function checkForUpdate() {
  const response = await fetch("/version.json?t=" + Date.now());
  if (!response.ok) {
    throw new Error("Failed to fetch version.json");
  }
  return response.json();
}

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

async function doRegisterServiceWorker(version${T(ts, "string")})${R(ts, "Promise<ServiceWorkerRegistration>")}{
  const swUrl = \`/sw-v\${version}.js\`;
  const registration = await navigator.serviceWorker.register(swUrl);
  localStorage.setItem("swRegisteredVersion", version);
  window.currentSWVersion = version;
  window.swRegisteredVersion = version;
  window.dispatchEvent(new CustomEvent("sw-version-detected"));
  return registration;
}

/** Register the SW with version checking and update flow. Checks version.json, handles updates, and dispatches sw-ready/sw-error events. */
export async function initServiceWorker()${R(ts, "Promise<void>")}{
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return;
  }

  try {
    const manifest = await checkForUpdate();
    const currentVersion = localStorage.getItem("swRegisteredVersion");
    window.latestSWVersion = manifest.version;
    window.swMinSupportedVersion = manifest.minSupportedVersion || "0.0.0";

    if (currentVersion === manifest.version) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.active) {
        window.currentSWVersion = currentVersion ?? undefined;
        window.dispatchEvent(new CustomEvent("sw-version-detected"));
        await waitForController();
        if (!window.swReady) {
          window.dispatchEvent(new CustomEvent("sw-ready"));
        }
      }
    } else if (currentVersion && currentVersion !== manifest.version) {
      window.swAvailableVersion = manifest.version;
      window.swUpdateRequired =
        semverCompare(currentVersion, manifest.minSupportedVersion || "0.0.0") < 0;

      if (AUTO_UPDATE) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          if (AUTO_ACTIVATE) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          } else {
            window.dispatchEvent(
              new CustomEvent("sw-update-available", {
                detail: { version: manifest.version },
              })
            );
          }
        } else {
          const newReg = await doRegisterServiceWorker(manifest.version);
          if (AUTO_ACTIVATE && newReg.waiting) {
            newReg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
          // If the new SW is waiting (and not auto-activating), notify the user
          if (newReg.waiting && !AUTO_ACTIVATE) {
            window.dispatchEvent(
              new CustomEvent("sw-update-available", {
                detail: { version: manifest.version },
              })
            );
          }
        }
      } else {
        window.dispatchEvent(
          new CustomEvent("sw-update-available", {
            detail: { version: manifest.version },
          })
        );
      }
    } else {
      const reg = await doRegisterServiceWorker(manifest.version);
      await waitForController();
      window.dispatchEvent(new CustomEvent("sw-ready"));
    }
  } catch (error) {
    try {
      const existing = await navigator.serviceWorker.getRegistration();
      if (existing && existing.active) {
        window.currentSWVersion = localStorage.getItem("swRegisteredVersion") || "unknown";
        window.dispatchEvent(new CustomEvent("sw-version-detected"));
        await waitForController();
        if (!window.swReady) {
          window.dispatchEvent(new CustomEvent("sw-ready"));
        }
        return;
      }
    } catch {
      // Handle the case where no existing active registration is found
    }

    console.error("Service Worker initialization failed:", error);
    window.swError = true;
    window.dispatchEvent(new CustomEvent("sw-error"));
  }
}

/** Accept a pending SW update. Reloads the page once the new SW takes control. */
export async function handleUpdateApproved(newVersion${T(ts, "string")})${R(ts, "Promise<void>")}{
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    registration.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  } else {
    await doRegisterServiceWorker(newVersion);
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
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
