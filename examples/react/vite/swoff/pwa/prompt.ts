/**
 * Swoff PWA Install Prompt
 * Installability check and manual prompt trigger.
 *
 * Usage:
 *   import { isInstallable, promptInstall } from './swoff/pwa/prompt.ts';
 *
 *   if (isInstallable()) {
 *     const result = await promptInstall();
 *   }
 *
 * Window properties:
 *   window.deferredInstallPrompt - The captured BeforeInstallPromptEvent
 */

/** Check if the PWA install prompt is available (user has met install criteria). */
export function isInstallable(): boolean {
  return !!window.deferredInstallPrompt;
}

/** Show the browser's native install prompt. Throws if prompt is not available. */
export async function promptInstall(): Promise<{ outcome: string }> {
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
