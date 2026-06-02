import { GeneratorContext, writeFile } from "./context.js";
import { generatePushCode } from "../../../runtime/push.js";

export function generatePush(ctx: GeneratorContext): void {
  writeFile(
    ctx,
    `push.${ctx.ext}`,
    generatePushCode({
      ts: ctx.ext === "ts",
      ext: ctx.ext,
      vapidKey: ctx.config.features.pushNotifications?.vapidPublicKey ?? "",
    }),
  );
}
