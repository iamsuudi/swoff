import { GeneratorContext, writeFile } from "./context.js";
import { generateNotificationCode } from "../../../runtime/notification.js";

export function generateNotification(ctx: GeneratorContext): void {
  writeFile(ctx, `notification.${ctx.ext}`, generateNotificationCode({ ts: ctx.ext === "ts", ext: ctx.ext }));
}
