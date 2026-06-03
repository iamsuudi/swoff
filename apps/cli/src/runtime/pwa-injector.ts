import type { RuntimeContext } from "./utils.js";
import { R } from "./utils.js";

export function generatePwaInjectorCode(ctx: RuntimeContext & { preventDefaultInstall: boolean }): string {
  const { ext, ts } = ctx;
  const preventLine = ctx.preventDefaultInstall ? "    e.preventDefault();\n" : "";

  return `/**
 * Swoff PWA Injector
 * Service worker installation event wiring for PWA installability.
 *
 * Usage:
 *   import { setupPwaInstall } from './swoff/pwa/injector.${ext}';
 *   setupPwaInstall();
 *
 * Window properties:
 *   window.deferredInstallPrompt - The captured BeforeInstallPromptEvent
 */

/** Set up beforeinstallprompt and appinstalled event listeners. Call once at app startup. */
export function setupPwaInstall()${R(ts, "void")}{
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
`;
}
