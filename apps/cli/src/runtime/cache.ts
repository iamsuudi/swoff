import type { RuntimeContext } from "./utils.js";
import { T, R } from "./utils.js";

export function generateCacheCode(ctx: RuntimeContext): string {
  const { ext, ts } = ctx;
  return `/**
 * Swoff Cache Invalidation
 * Framework-agnostic cache tag invalidation.
 *
 * Usage:
 *   import { invalidateByTag, invalidateByTags } from './swoff/cache.${ext}';
 *
 *   // After a mutation, invalidate related cache
 *   await invalidateByTag("todos");
 */

/** Invalidate all cached responses tagged with the given tag. Sends INVALIDATE_TAG to the SW; the client-injector dispatches cache-invalidated on SW confirmation. */
export async function invalidateByTag(tag${T(ts, "string")})${R(ts, "Promise<void>")}{
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "INVALIDATE_TAG",
    tag,
  });
}

/** Invalidate all cached responses matching any of the given tags. */
export async function invalidateByTags(tags${T(ts, "string[]")})${R(ts, "Promise<void>")}{
  await Promise.all(tags.map((tag) => invalidateByTag(tag)));
}
`;
}
