/**
 * Generates cache.{js|ts} - cache tag invalidation utilities.
 */

import { GeneratorContext, writeFile } from "./context.js";
import type { TagInvalidationConfig } from "../../shared/config-types.js";

function generateCascadingCode(cascading: Record<string, string[]>): string {
  if (!cascading || Object.keys(cascading).length === 0) return "null";
  return JSON.stringify(cascading);
}

export function generateCache(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");

  const ti = ctx.config.features.tagInvalidation;
  const tiConfig: TagInvalidationConfig = typeof ti === "boolean"
    ? { enabled: ti }
    : ti;

  const cascading = tiConfig.cascading ?? {};
  const cascadingCode = generateCascadingCode(cascading);

  const code = `/**
 * Swoff Cache Invalidation
 * Framework-agnostic cache tag invalidation with cascading support.
 *
 * Usage:
 *   import { invalidateByTag } from './swoff/cache.${ext}';
 *
 *   // After a mutation, invalidate related cache
 *   await invalidateByTag("todos");
 */

// Cascading invalidation map (tag → dependent tags)
const CASCADING = ${cascadingCode};

/** Expand tags with cascading dependencies, deduplicated. */
function expandCascading(tags${T("string[]")})${R("string[]")}{
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

/** Invalidate all cached responses tagged with the given tag. Dispatches cache-invalidated event. Also invalidates cascading dependencies. */
export async function invalidateByTag(tag${T("string")})${R("Promise<void>")}{
  if (!navigator.serviceWorker?.controller) return;

  const allTags = CASCADING ? expandCascading([tag]) : [tag];

  navigator.serviceWorker.controller.postMessage({
    type: "INVALIDATE_TAG",
    tag,
  });

  // Invalidate cascading dependencies separately
  if (allTags.length > 1) {
    const cascadingTags = allTags.filter((t) => t !== tag);
    for (const dep of cascadingTags) {
      navigator.serviceWorker.controller.postMessage({
        type: "INVALIDATE_TAG",
        tag: dep,
      });
    }
  }

  window.dispatchEvent(
    new CustomEvent("cache-invalidated", { detail: { tags: allTags } })
  );
}

/** Invalidate all cached responses matching any of the given tags, including cascading dependencies. */
export async function invalidateByTags(tags${T("string[]")})${R("Promise<void>")}{
  const allTags = CASCADING ? expandCascading(tags) : tags;
  await Promise.all(allTags.map((tag) => invalidateByTag(tag)));
}
`;

  writeFile(ctx, `cache.${ext}`, code);
}
