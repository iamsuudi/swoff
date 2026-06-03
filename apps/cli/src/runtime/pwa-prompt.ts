import type { RuntimeContext } from "./utils.js";
import { R } from "./utils.js";

export function generatePwaPromptCode(ctx: RuntimeContext): string {
  const { ext, ts } = ctx;

  return `/**
 * Swoff PWA Install Prompt
 * Installability check and manual prompt trigger.
 *
 * Usage:
 *   import { isInstallable, promptInstall } from './swoff/pwa/prompt.${ext}';
 *
 *   if (isInstallable()) {
 *     const result = await promptInstall();
 *   }
 *
 * Window properties:
 *   window.deferredInstallPrompt - The captured BeforeInstallPromptEvent
 */

/** Check if the PWA install prompt is available (user has met install criteria). */
export function isInstallable()${R(ts, "boolean")}{
  return !!window.deferredInstallPrompt;
}

/** Show the browser's native install prompt. Throws if prompt is not available. */
export async function promptInstall()${R(ts, "Promise<{ outcome: string }>")}{
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
}
