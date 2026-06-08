import { GeneratorContext, writeFile } from "./context.js";
import { generatePushCode } from "../../../runtime/push.js";

export function generatePush(ctx: GeneratorContext): void {
  writeFile(
    ctx,
    `realtime/notifications.${ctx.ext}`,
    generatePushCode({
      ts: ctx.ext === "ts",
      ext: ctx.ext,
      vapidKey: ctx.config.features.realtime.vapidPublicKey ?? "",
    }),
  );
}
