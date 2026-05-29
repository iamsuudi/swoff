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
  const debounceMs = tiConfig.debounceMs ?? 0;
  const debounceCode = debounceMs > 0 ? `
const INVALIDATION_DEBOUNCE_MS = ${debounceMs};
let _debounceBatch${T("string[]")} = [];
let _debounceTimer${T("ReturnType<typeof setTimeout> | null")} = null;
let _debounceWaiters${T("Array<() => void>")} = [];

function flushInvalidation() {
  const tags = [...new Set(_debounceBatch)];
  _debounceBatch = [];
  _debounceTimer = null;
  const waiters = _debounceWaiters;
  _debounceWaiters = [];

  if (navigator.serviceWorker?.controller) {
    for (const t of tags) {
      navigator.serviceWorker.controller.postMessage({ type: "INVALIDATE_TAG", tag: t });
    }
  }

  const allTags = CASCADING ? [...new Set(tags.flatMap(function(t) { return expandCascading([t]); }))] : tags;
  window.dispatchEvent(new CustomEvent("cache-invalidated", { detail: { tags: allTags } }));

  waiters.forEach(function(r) { r(); });
}

function debouncedInvalidate(tag${T("string")})${R("Promise<void>")}{
  _debounceBatch.push(tag);
  if (_debounceTimer) clearTimeout(_debounceTimer);
  return new Promise(function(resolve) {
    _debounceWaiters.push(resolve);
    _debounceTimer = setTimeout(flushInvalidation, INVALIDATION_DEBOUNCE_MS);
  });
}
` : "";

  const invalidateBody = debounceMs > 0 ? `  return debouncedInvalidate(tag);` : `
  if (!navigator.serviceWorker?.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: "INVALIDATE_TAG",
    tag,
  });

  const allTags = CASCADING ? expandCascading([tag]) : [tag];
  window.dispatchEvent(
    new CustomEvent("cache-invalidated", { detail: { tags: allTags } })
  );`;

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
${debounceCode}
/** Invalidate all cached responses tagged with the given tag. Dispatches cache-invalidated event with cascading dependencies expanded. */
export async function invalidateByTag(tag${T("string")})${R("Promise<void>")}{${invalidateBody}
}

/** Invalidate all cached responses matching any of the given tags. Cascading should be expanded by the caller (e.g., invalidateUrl in invalidation-tags) before passing here. */
export async function invalidateByTags(tags${T("string[]")})${R("Promise<void>")}{
  await Promise.all(tags.map((tag) => invalidateByTag(tag)));
}
`;

  writeFile(ctx, `cache.${ext}`, code);
}
