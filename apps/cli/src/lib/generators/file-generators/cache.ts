import { GeneratorContext, writeFile } from "./context.js";
import { generateCacheCode } from "../../../runtime/cache.js";

export function generateCache(ctx: GeneratorContext): void {
  const cascading = ctx.config.features.caching.tagInvalidation.cascading ?? {};
  writeFile(ctx, `cache/invalidate.${ctx.ext}`, generateCacheCode({ ts: ctx.ext === "ts", ext: ctx.ext }, cascading));
}
