/**
 * Generates fetch-wrapper.ts/js — unified fetch with caching, auth, offline queue, auto-invalidation,
 * staleTime, prefetching, and cancellation.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateFetchWrapperCode } from "../../../runtime/fetch-wrapper.js";

export function generateFetchWrapper(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";

  const code = generateFetchWrapperCode(
    { ts, ext },
    ctx.config.features.auth.enabled,
    ctx.config.features.caching.mutationQueue.enabled,
    ctx.config.features.caching.tagInvalidation.enabled,
    ctx.config.features.caching.requestBatchWindowMs,
  );

  writeFile(ctx, `fetch/core.${ext}`, code);
}
