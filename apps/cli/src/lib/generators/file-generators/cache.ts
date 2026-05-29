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
 * Cascading is resolved at the client level before dispatching to the SW.
 * Each received tag is sent as a separate INVALIDATE_TAG message.
 *
 * Usage:
 *   import { invalidateByTag } from './swoff/cache.${ext}';
 *
 *   // After a mutation, invalidate related cache
 *   await invalidateByTag("todos");
 */

// Cascading invalidation map (tag → dependent tags)
// Used to expand window events so hooks know which tags were affected.
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

/** Invalidate all cached responses tagged with the given tag. Dispatches cache-invalidated event with cascading dependencies expanded. */
export async function invalidateByTag(tag${T("string")})${R("Promise<void>")}{
  if (!navigator.serviceWorker?.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: "INVALIDATE_TAG",
    tag,
  });

  // Expand cascading for the window event so hooks know all affected tags
  const allTags = CASCADING ? expandCascading([tag]) : [tag];
  window.dispatchEvent(
    new CustomEvent("cache-invalidated", { detail: { tags: allTags } })
  );
}

/** Invalidate all cached responses matching any of the given tags. Cascading should be expanded by the caller (e.g., invalidateUrl in invalidation-tags) before passing here. */
export async function invalidateByTags(tags${T("string[]")})${R("Promise<void>")}{
  await Promise.all(tags.map((tag) => invalidateByTag(tag)));
}
`;

  writeFile(ctx, `cache.${ext}`, code);
}
