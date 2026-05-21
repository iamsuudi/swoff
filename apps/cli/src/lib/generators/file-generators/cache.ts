/**
 * Generates cache.js - cache tag invalidation and cross-tab sync.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateCache(ctx: GeneratorContext): void {
  const code = `/**
 * Swoff Cache Invalidation & Cross-Tab Sync
 * Framework-agnostic cache tag invalidation and cross-tab synchronization.
 *
 * Usage:
 *   import { invalidateByTag, initCrossTabSync } from './swoff/cache.js';
 *
 *   // Call once during app init
 *   initCrossTabSync();
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
`;

  writeFile(ctx, "cache.js", code);
}
