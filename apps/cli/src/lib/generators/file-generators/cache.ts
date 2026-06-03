import { GeneratorContext, writeFile } from "./context.js";
import { generateCacheCode } from "../../../runtime/cache.js";

export function generateCache(ctx: GeneratorContext): void {
  writeFile(ctx, `cache/index.${ctx.ext}`, generateCacheCode({ ts: ctx.ext === "ts", ext: ctx.ext }));
}
