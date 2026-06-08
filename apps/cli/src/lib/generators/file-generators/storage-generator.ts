import { GeneratorContext, writeFile } from "./context.js";
import { generateNotificationCode } from "../../../runtime/notification.js";

export function generateStorage(ctx: GeneratorContext): void {
  writeFile(ctx, `storage.${ctx.ext}`, generateNotificationCode({ ts: ctx.ext === "ts", ext: ctx.ext }));
}
