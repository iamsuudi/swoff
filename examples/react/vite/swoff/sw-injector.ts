/**
 * Swoff SW Injector
 * Framework-agnostic SW registration, PWA install support, and cross-tab sync.
 *
 * Usage:
 *   import { initServiceWorker } from './swoff/sw-injector.ts';
 *
 *   // Call in your app entry point (e.g., main.tsx, app.js):
 *   initServiceWorker();
 *
 * Window events:
 *   sw-version-detected  - Version info available on window
 *   sw-update-available  - New version ready for user consent (detail: { version })
 *   sw-progress          - Download progress (detail: { percent, downloaded, total })
 *   sw-ready             - SW active and controlling page
 *   sw-error             - SW registration failed
 *   pwa-installable      - PWA can be installed (detail: { isInstallable: true })
 *   pwa-installed        - User accepted install (detail: { outcome: 'accepted' })
 *   cache-invalidated    - Cache entries with given tags cleared (detail: { tags })
 *
 * Window properties:
 *   window.latestSWVersion       - Latest version from version.json
 *   window.currentSWVersion      - Active SW version
 *   window.swAvailableVersion    - Pending update version
 *   window.swUpdateRequired      - Forced update needed (version < minSupportedVersion)
 *   window.swMinSupportedVersion - Minimum supported version from version.json
 *   window.swReady               - SW is active
 *   window.swError               - Registration failed
 *   window.deferredInstallPrompt - Captured BeforeInstallPromptEvent
 *   window.pwaInstallable        - Whether PWA can be installed
 */

const AUTO_REGISTER = true;
const AUTO_ACTIVATE = true;

// --- SW Registration ---

async function checkForUpdate() {
  const response = await fetch("/version.json");
  if (!response.ok) {
    throw new Error("Failed to fetch version.json");
  }
  return response.json();
}

async function doRegisterServiceWorker(version) {
  const swUrl = `/sw-v${version}.js`;
  const registration = await navigator.serviceWorker.register(swUrl);
  localStorage.setItem("swRegisteredVersion", version);
  window.currentSWVersion = version;
  window.swRegisteredVersion = version;
  window.dispatchEvent(new CustomEvent("sw-version-detected"));
  window.dispatchEvent(new CustomEvent("sw-ready"));
  return registration;
}

function shouldRegister() {
  return true;
}

export async function initServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return;
  }

  if (!shouldRegister()) return;

  try {
    const manifest = await checkForUpdate();
    const currentVersion = localStorage.getItem("swRegisteredVersion");
    window.latestSWVersion = manifest.version;
    window.swMinSupportedVersion = manifest.minSupportedVersion || "0.0.0";

    if (currentVersion === manifest.version) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.active) {
        window.currentSWVersion = currentVersion;
        window.dispatchEvent(new CustomEvent("sw-version-detected"));
        window.dispatchEvent(new CustomEvent("sw-ready"));
      }
    } else if (currentVersion && currentVersion !== manifest.version) {
      window.swAvailableVersion = manifest.version;
      window.swUpdateRequired =
        currentVersion < (manifest.minSupportedVersion || "0.0.0");

      if (AUTO_REGISTER) {
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
        window.dispatchEvent(new CustomEvent("sw-ready"));
        return;
      }
    } catch {}

    console.error("Service Worker initialization failed:", error);
    window.swError = true;
    window.dispatchEvent(new CustomEvent("sw-error"));
  }
}

export async function handleUpdateApproved(newVersion) {
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

export async function skipWaiting() {
  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}

// --- PWA Install Support ---

window.addEventListener("beforeinstallprompt", (e) => {
  window.deferredInstallPrompt = e;
  window.pwaInstallable = true;

  if (false) {
    e.preventDefault();
  }

  window.dispatchEvent(
    new CustomEvent("pwa-installable", {
      detail: { isInstallable: true },
    })
  );
});

window.addEventListener("appinstalled", () => {
  window.deferredInstallPrompt = null;
  window.pwaInstallable = false;

  window.dispatchEvent(
    new CustomEvent("pwa-installed", {
      detail: { outcome: "accepted" },
    })
  );
});

// --- SW Message Listener ---
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data.type === "SW_PROGRESS") {
      const { percent, downloaded, total } = event.data;
      window.dispatchEvent(
        new CustomEvent("sw-progress", {
          detail: { percent, downloaded, total },
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

    if (event.data.type === "TAG_INVALIDATED" && event.data.tag) {
      window.dispatchEvent(
        new CustomEvent("cache-invalidated", {
          detail: { tags: [event.data.tag] },
        })
      );
    }
  });
}
