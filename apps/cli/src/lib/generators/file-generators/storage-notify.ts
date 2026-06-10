import { GeneratorContext, writeFile } from "./context.js";
import { generateNotificationCode } from "../../../runtime/notification.js";

export function generateStorageNotify(ctx: GeneratorContext): void {
  writeFile(ctx, `storage-notify.${ctx.ext}`, generateNotificationCode({ ts: ctx.ext === "ts", ext: ctx.ext }));
}
