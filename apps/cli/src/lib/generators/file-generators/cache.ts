import { GeneratorContext, writeFile } from "./context.js";

function generateCascadingCode(cascading: Record<string, string[]>): string {
  if (!cascading || Object.keys(cascading).length === 0) return "null";
  return JSON.stringify(cascading);
}

export function generateCache(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");

  const tiConfig = ctx.config.features.tagInvalidation;
  const cascading = tiConfig.cascading ?? {};
  const cascadingCode = generateCascadingCode(cascading);

  const code = `/**
 * Swoff Cache Invalidation
 * Framework-agnostic cache tag invalidation with cascading support.
 *
 * Usage:
 *   import { invalidateByTag, invalidateByTags } from './swoff/cache.${ext}';
 *
 *   // After a mutation, invalidate related cache
 *   await invalidateByTag("todos");
 */

// Cascading invalidation map (tag → dependent tags)
// Used to expand window events so hooks know which tags were affected.
const CASCADING = ${cascadingCode};

/** Invalidate all cached responses tagged with the given tag. Dispatches cache-invalidated event with cascading dependencies expanded. */
export async function invalidateByTag(tag${T("string")})${R("Promise<void>")}{
  if (!navigator.serviceWorker?.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: "INVALIDATE_TAG",
    tag,
  });

  // Expand cascading for the window event so hooks know about dependent tags
  const allTags = CASCADING
    ? [...new Set([tag, ...(CASCADING[tag] || [])])]
    : [tag];
  window.dispatchEvent(
    new CustomEvent("cache-invalidated", { detail: { tags: allTags } })
  );
}

/** Invalidate all cached responses matching any of the given tags. Cascading should be expanded by callers (e.g., invalidateUrl in invalidation-tags) before calling here; this function does not expand further. */
export async function invalidateByTags(tags${T("string[]")})${R("Promise<void>")}{
  await Promise.all(tags.map((tag) => invalidateByTag(tag)));
}
`;

  writeFile(ctx, `cache.${ext}`, code);
}
