/**
 * Generates sw-injector.{js|ts} - client-side SW registration with version checking.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateSwInjector(ctx: GeneratorContext): void {
  const autoRegister = ctx.config.serviceWorker.autoRegister;
  const autoUpdate = ctx.config.serviceWorker.autoUpdate;
  const ext = ctx.ext;

  const code = `/**
 * Swoff Service Worker Injector
 * Framework-agnostic client registration with version checking.
 *
 * Usage:
 *   import { initServiceWorker, shouldRegisterSW } from './swoff/sw-injector.${ext}';
 *
 *   // Call in your app entry point (e.g., main.tsx, app.js):
 *   if (shouldRegisterSW()) {
 *     initServiceWorker();
 *   }
 *
 *   // Or defer until after onboarding:
 *   function myShouldRegister() {
 *     return localStorage.getItem('onboarding-complete') === 'true';
 *   }
 *   if (myShouldRegister()) {
 *     initServiceWorker();
 *   }
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
 *   window.swMinSupportedVersion - Minimum supported version from version.json
 *   window.swReady               - SW is active
 *   window.swError               - Registration failed
 */

const AUTO_REGISTER = ${autoRegister};
const AUTO_UPDATE = ${autoUpdate};

async function checkForUpdate() {
  const response = await fetch("/version.json");
  if (!response.ok) {
    throw new Error("Failed to fetch version.json");
  }
  return response.json();
}

async function doRegisterServiceWorker(version) {
  const swUrl = \`/sw-v\${version}.js\`;
  const registration = await navigator.serviceWorker.register(swUrl);
  localStorage.setItem("swRegisteredVersion", version);
  window.currentSWVersion = version;
  window.swRegisteredVersion = version;
  window.dispatchEvent(new CustomEvent("sw-version-detected"));
  window.dispatchEvent(new CustomEvent("sw-ready"));
  return registration;
}

export function shouldRegisterSW() {
  if (!AUTO_REGISTER) return false;

  // Add custom conditions here. Return false to prevent registration.
  // Examples:
  //   - Check if user completed onboarding
  //   - Check if user accepted terms
  //   - Check if user is on a slow connection
  //
  // if (!localStorage.getItem("onboarding-complete")) return false;
  // if (navigator.connection?.effectiveType === "slow-2g") return false;

  return true;
}

export async function initServiceWorker() {
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
        window.currentSWVersion = currentVersion;
        window.dispatchEvent(new CustomEvent("sw-version-detected"));
        window.dispatchEvent(new CustomEvent("sw-ready"));
      }
    } else if (currentVersion && currentVersion !== manifest.version) {
      window.swAvailableVersion = manifest.version;
      window.swUpdateRequired =
        currentVersion < (manifest.minSupportedVersion || "0.0.0");

      if (AUTO_UPDATE) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        } else {
          await doRegisterServiceWorker(manifest.version);
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
    // Offline or version.json fetch failed — try using existing registration
    try {
      const existing = await navigator.serviceWorker.getRegistration();
      if (existing && existing.active) {
        window.currentSWVersion = localStorage.getItem("swRegisteredVersion") || "unknown";
        window.dispatchEvent(new CustomEvent("sw-version-detected"));
        window.dispatchEvent(new CustomEvent("sw-ready"));
        return;
      }
    } catch {
      // Registration check also failed, nothing we can do
    }

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
  });
}
`;

  writeFile(ctx, `sw-injector.${ext}`, code);
}
