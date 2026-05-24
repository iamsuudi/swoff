/**
 * Generates sw/injector.{js|ts} - core SW registration logic only.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateSwInjector(ctx: GeneratorContext): void {
  const autoUpdate = ctx.config.features.serviceWorker.autoUpdate;
  const autoActivate = ctx.config.features.serviceWorker.autoActivate;
  const versionEnabled = ctx.config.features.serviceWorker.version.enabled;
  const ext = ctx.ext;
  const ts = ext === "ts";

  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");

  const versionedCode = `/**
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

function semverCompare(a${T("string")}, b${T("string")})${R("number")}{
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

async function checkForUpdate() {
  const response = await fetch("/version.json");
  if (!response.ok) {
    throw new Error("Failed to fetch version.json");
  }
  return response.json();
}

async function waitForController()${R("Promise<void>")}{
  return new Promise<void>((resolve) => {
    if (navigator.serviceWorker.controller) {
      resolve();
    } else {
      navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
    }
  });
}

async function doRegisterServiceWorker(version${T("string")})${R("Promise<ServiceWorkerRegistration>")}{
  const swUrl = \`/sw-v\${version}.js\`;
  const registration = await navigator.serviceWorker.register(swUrl);
  localStorage.setItem("swRegisteredVersion", version);
  window.currentSWVersion = version;
  window.swRegisteredVersion = version;
  window.dispatchEvent(new CustomEvent("sw-version-detected"));
  await waitForController();
  window.dispatchEvent(new CustomEvent("sw-ready"));
  return registration;
}

export async function initServiceWorker()${R("Promise<void>")}{
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
    } catch {}

    console.error("Service Worker initialization failed:", error);
    window.swError = true;
    window.dispatchEvent(new CustomEvent("sw-error"));
  }
}

export async function handleUpdateApproved(newVersion${T("string")})${R("Promise<void>")}{
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

export async function skipWaiting()${R("Promise<void>")}{
  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}
`;

  const simpleCode = `/**
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
async function waitForController()${R("Promise<void>")}{
  return new Promise<void>((resolve) => {
    if (navigator.serviceWorker.controller) {
      resolve();
    } else {
      navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
    }
  });
}

export async function initServiceWorker()${R("Promise<void>")}{
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
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

  const code = versionEnabled ? versionedCode : simpleCode;

  writeFile(ctx, `sw/injector.${ext}`, code);
}
