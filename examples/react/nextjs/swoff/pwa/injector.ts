/**
 * Swoff PWA Injector
 * Service worker installation event wiring for PWA installability.
 *
 * Usage:
 *   import { setupPwaInstall } from './swoff/pwa/injector.ts';
 *   setupPwaInstall();
 *
 * Window properties:
 *   window.deferredInstallPrompt - The captured BeforeInstallPromptEvent
 */

/** Set up beforeinstallprompt and appinstalled event listeners. Call once at app startup. */
export function setupPwaInstall(): void {
  window.addEventListener("beforeinstallprompt", (e) => {
    window.deferredInstallPrompt = e as BeforeInstallPromptEvent;
    window.pwaInstallable = true;


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
