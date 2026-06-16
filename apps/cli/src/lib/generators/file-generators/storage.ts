import { GeneratorContext, writeFile } from "./context.js";
import { generateStorageCode } from "../../../runtime/storage.js";

export function generateStorage(ctx: GeneratorContext): void {
  writeFile(ctx, `storage.${ctx.ext}`, generateStorageCode({ ts: ctx.ext === "ts", ext: ctx.ext }));
}
