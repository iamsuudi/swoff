/**
 * Generates cache.js - cache tag invalidation and cross-tab sync.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateCache(ctx: GeneratorContext, crossTabSyncEnabled: boolean): void {
  const crossTabCode = crossTabSyncEnabled
    ? `
export function initCrossTabSync() {
  if (!navigator.serviceWorker) return;

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data.type === "TAG_INVALIDATED" && event.data.tag) {
      window.dispatchEvent(
        new CustomEvent("cache-invalidated", {
          detail: { tags: [event.data.tag] },
        })
      );
    }
  });
}

(function() {
  const tryInit = () => {
    if (navigator.serviceWorker?.controller) {
      initCrossTabSync();
    } else {
      navigator.serviceWorker?.addEventListener("controllerchange", tryInit, { once: true });
    }
  };
  tryInit();
})();
`
    : "";

  const code = `/**
 * Swoff Cache Invalidation
 * Framework-agnostic cache tag invalidation.
 *
 * Usage:
 *   import { invalidateByTag } from './swoff/cache.js';
 *
 *   // After a mutation, invalidate related cache
 *   await invalidateByTag("todos");
 */

export async function invalidateByTag(tag) {
  if (!navigator.serviceWorker?.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: "INVALIDATE_TAG",
    tag,
  });

  window.dispatchEvent(
    new CustomEvent("cache-invalidated", { detail: { tags: [tag] } })
  );
}

export async function invalidateByTags(tags) {
  for (const tag of tags) {
    await invalidateByTag(tag);
  }
}
${crossTabCode}`;

  writeFile(ctx, "cache.js", code);
}
