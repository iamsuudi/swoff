/**
 * Swoff Cache Invalidation
 * Framework-agnostic cache tag invalidation.
 *
 * Usage:
 *   import { invalidateByTag } from './swoff/cache.ts';
 *
 *   // After a mutation, invalidate related cache
 *   await invalidateByTag("todos");
 */

/** Invalidate all cached responses tagged with the given tag. Dispatches cache-invalidated event. */
export async function invalidateByTag(tag: string): Promise<void> {
  if (!navigator.serviceWorker?.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: "INVALIDATE_TAG",
    tag,
  });

  window.dispatchEvent(
    new CustomEvent("cache-invalidated", { detail: { tags: [tag] } })
  );
}

/** Invalidate all cached responses matching any of the given tags. */
export async function invalidateByTags(tags: string[]): Promise<void> {
  await Promise.all(tags.map((tag) => invalidateByTag(tag)));
}
