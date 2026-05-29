/**
 * Swoff Cache Invalidation
 * Framework-agnostic cache tag invalidation with cascading support.
 *
 * Cascading is resolved at the client level before dispatching to the SW.
 * Each received tag is sent as a separate INVALIDATE_TAG message.
 *
 * Usage:
 *   import { invalidateByTag } from './swoff/cache.ts';
 *
 *   // After a mutation, invalidate related cache
 *   await invalidateByTag("todos");
 */

// Cascading invalidation map (tag → dependent tags)
// Used to expand window events so hooks know which tags were affected.
const CASCADING = null;

/** Expand tags with cascading dependencies, deduplicated. */
function expandCascading(tags: string[]): string[] {
  if (!CASCADING) return tags;
  const result = new Set(tags);
  for (const tag of tags) {
    const deps = CASCADING[tag];
    if (deps) {
      for (const dep of deps) {
        result.add(dep);
      }
    }
  }
  return [...result];
}

/** Invalidate all cached responses tagged with the given tag. Dispatches cache-invalidated event with cascading dependencies expanded. */
export async function invalidateByTag(tag: string): Promise<void> {
  if (!navigator.serviceWorker?.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: "INVALIDATE_TAG",
    tag,
  });

  const allTags = CASCADING ? expandCascading([tag]) : [tag];
  window.dispatchEvent(
    new CustomEvent("cache-invalidated", { detail: { tags: allTags } })
  );
}

/** Invalidate all cached responses matching any of the given tags. Cascading should be expanded by the caller (e.g., invalidateUrl in invalidation-tags) before passing here. */
export async function invalidateByTags(tags: string[]): Promise<void> {
  await Promise.all(tags.map((tag) => invalidateByTag(tag)));
}
