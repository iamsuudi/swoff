/**
 * Swoff Cache Invalidation
 * Framework-agnostic cache tag invalidation.
 *
 * Usage:
 *   import { invalidateByTag, invalidateByTags } from './swoff/cache.ts';
 *
 *   // After a mutation, invalidate related cache
 *   await invalidateByTag("todos");
 */

/** Invalidate all cached responses tagged with the given tag. Sends INVALIDATE_TAG to the SW; the client-injector dispatches cache-invalidated on SW confirmation. */
export async function invalidateByTag(tag: string): Promise<void> {
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "INVALIDATE_TAG",
    tag,
  });
}

/** Invalidate all cached responses matching any of the given tags. */
export async function invalidateByTags(tags: string[]): Promise<void> {
  await Promise.all(tags.map((tag) => invalidateByTag(tag)));
}
