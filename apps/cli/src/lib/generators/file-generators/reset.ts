import { GeneratorContext, writeFile } from "./context.js";
import { generateResetCode } from "../../../runtime/reset.js";

export function generateReset(ctx: GeneratorContext): void {
  writeFile(ctx, `reset.${ctx.ext}`, generateResetCode({ ts: ctx.ext === "ts", ext: ctx.ext }));
}
