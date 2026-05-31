import { GeneratorContext, writeFile } from "./context.js";

export function generateCache(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");

  const code = `/**
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
export async function invalidateByTag(tag${T("string")})${R("Promise<void>")}{
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "INVALIDATE_TAG",
    tag,
  });
}

/** Invalidate all cached responses matching any of the given tags. */
export async function invalidateByTags(tags${T("string[]")})${R("Promise<void>")}{
  await Promise.all(tags.map((tag) => invalidateByTag(tag)));
}
`;

  writeFile(ctx, `cache.${ext}`, code);
}
