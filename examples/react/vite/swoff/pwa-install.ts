/**
 * Swoff PWA Install Prompt
 * Manual install trigger and installability check.
 * Event listeners are registered in sw-injector at app entry.
 *
 * Usage:
 *   import { isInstallable, promptInstall } from './swoff/pwa-install.ts';
 *
 *   if (isInstallable()) {
 *     const result = await promptInstall();
 *     console.log('User choice:', result.outcome);
 *   }
 *
 * Window properties (set by sw-injector):
 *   window.deferredInstallPrompt - The captured BeforeInstallPromptEvent
 */

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
