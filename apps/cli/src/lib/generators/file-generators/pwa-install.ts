/**
 * Generates pwa-install.{js|ts} - PWA install prompt utility.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generatePwaInstall(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const R = (type: string) => (ts ? `: ${type} ` : " ");
  const preventDefaultInstall = ctx.config.features.pwa.preventDefaultInstall;
  const preventLine = preventDefaultInstall ? "    e.preventDefault();\n" : "";

  const code = `/**
 * Swoff PWA Install Support
 * Manual install trigger, installability check, and event listener setup.
 *
 * Usage:
 *   import { setupPwaInstall, isInstallable, promptInstall } from './swoff/pwa/install.${ext}';
 *
 *   setupPwaInstall();  // sets up beforeinstallprompt and appinstalled listeners
 *
 *   if (isInstallable()) {
 *     const result = await promptInstall();
 *   }
 *
 * Window properties:
 *   window.deferredInstallPrompt - The captured BeforeInstallPromptEvent
 */

/** Set up beforeinstallprompt and appinstalled event listeners. Call once at app startup. */
export function setupPwaInstall()${R("void")}{
  window.addEventListener("beforeinstallprompt", (e) => {
    window.deferredInstallPrompt = e as BeforeInstallPromptEvent;
    window.pwaInstallable = true;

${preventLine}
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
}

/** Check if the PWA install prompt is available (user has met install criteria). */
export function isInstallable()${R("boolean")}{
  return !!window.deferredInstallPrompt;
}

/** Show the browser's native install prompt. Throws if prompt is not available. */
export async function promptInstall()${R("Promise<{ outcome: string }>")}{
  if (!window.deferredInstallPrompt) {
    throw new Error("Install prompt not available");
  }

  const promptEvent = window.deferredInstallPrompt;
  await promptEvent.prompt();

  const choice = await promptEvent.userChoice;

  if (choice.outcome === "accepted") {
    window.dispatchEvent(
      new CustomEvent("pwa-installed", {
        detail: { outcome: "accepted" },
      })
    );
  } else {
    window.dispatchEvent(
      new CustomEvent("pwa-dismissed", {
        detail: { outcome: "dismissed" },
      })
    );
  }

  window.deferredInstallPrompt = null;
  return choice;
}
`;

  writeFile(ctx, `pwa/install.${ext}`, code);
}
