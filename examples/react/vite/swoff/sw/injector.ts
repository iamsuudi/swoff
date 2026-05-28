/**
 * Swoff SW Injector
 * Framework-agnostic SW registration with versioned URLs and update flow.
 *
 * Usage:
 *   import { initServiceWorker } from './swoff/sw/injector.ts';
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
const AUTO_UPDATE = true;
const AUTO_ACTIVATE = false;

function semverCompare(a: string, b: string): number {
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

async function waitForController(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (navigator.serviceWorker.controller) {
      resolve();
    } else {
      navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
    }
  });
}

async function doRegisterServiceWorker(version: string): Promise<ServiceWorkerRegistration> {
  const swUrl = `/sw-v${version}.js`;
  const registration = await navigator.serviceWorker.register(swUrl);
  localStorage.setItem("swRegisteredVersion", version);
  window.currentSWVersion = version;
  window.swRegisteredVersion = version;
  window.dispatchEvent(new CustomEvent("sw-version-detected"));
  await waitForController();
  window.dispatchEvent(new CustomEvent("sw-ready"));
  return registration;
}

/** Register the SW with version checking and update flow. Checks version.json, handles updates, and dispatches sw-ready/sw-error events. */
export async function initServiceWorker(): Promise<void> {
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
          } else {
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
      await doRegisterServiceWorker(manifest.version);
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
export async function handleUpdateApproved(newVersion: string): Promise<void> {
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
export async function skipWaiting(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}
