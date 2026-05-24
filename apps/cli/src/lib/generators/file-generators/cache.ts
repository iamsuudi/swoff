/**
 * Generates cache.{js|ts} - cache tag invalidation utilities.
 */

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
 *   import { invalidateByTag } from './swoff/cache.${ext}';
 *
 *   // After a mutation, invalidate related cache
 *   await invalidateByTag("todos");
 */

export async function invalidateByTag(tag${T("string")}${R("Promise<void>")}{
  if (!navigator.serviceWorker?.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: "INVALIDATE_TAG",
    tag,
  });

  window.dispatchEvent(
    new CustomEvent("cache-invalidated", { detail: { tags: [tag] } })
  );
}

export async function invalidateByTags(tags${T("string[]")}${R("Promise<void>")}{
  for (const tag of tags) {
    await invalidateByTag(tag);
  }
}
`;

  writeFile(ctx, `cache.${ext}`, code);
}
