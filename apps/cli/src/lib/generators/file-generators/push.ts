import { GeneratorContext, writeFile } from "./context.js";
import { generatePushCode } from "../../../runtime/push.js";

export function generatePush(ctx: GeneratorContext): void {
  writeFile(
    ctx,
    `push-notification/index.${ctx.ext}`,
    generatePushCode({
      ts: ctx.ext === "ts",
      ext: ctx.ext,
    }),
  );
}
