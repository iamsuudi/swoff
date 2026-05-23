/**
 * Generates pwa-install.js - PWA install prompt handler.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generatePwaInstall(ctx: GeneratorContext): void {
  const preventDefault = ctx.config.features.pwa?.preventDefaultInstall ?? false;

  const code = `/**
 * Swoff PWA Install Prompt Handler
 * Captures beforeinstallprompt event and provides manual install trigger.
 *
 * Usage:
 *   import { isInstallable, promptInstall } from './swoff/pwa-install.js';
 *
 *   // Listen for installable event
 *   window.addEventListener('pwa-installable', (e) => {
 *     console.log('PWA can be installed:', e.detail.isInstallable);
 *     // Show your custom install button
 *   });
 *
 *   // When user clicks install button
 *   async function onInstallClick() {
 *     const result = await promptInstall();
 *     console.log('User choice:', result);
 *   }
 *
 * Window events:
 *   pwa-installable  - PWA can be installed (detail: { isInstallable: true })
 *   pwa-installed    - User accepted install (detail: { outcome: 'accepted' })
 *   pwa-dismissed    - User dismissed install (detail: { outcome: 'dismissed' })
 *
 * Window properties:
 *   window.deferredInstallPrompt - The captured BeforeInstallPromptEvent
 *   window.pwaInstallable        - Whether PWA can be installed
 */

const PREVENT_DEFAULT_INSTALL = ${preventDefault};

window.addEventListener("beforeinstallprompt", (e) => {
  // Always capture the event so we never lose it
  window.deferredInstallPrompt = e;
  window.pwaInstallable = true;

  if (PREVENT_DEFAULT_INSTALL) {
    // Suppress browser's native prompt
    e.preventDefault();
  }
  // When false, browser shows native prompt naturally
  // but we still capture the event for manual triggering

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

export function isInstallable() {
  return !!window.deferredInstallPrompt;
}

export async function promptInstall() {
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

  writeFile(ctx, "pwa-install.js", code);
}
