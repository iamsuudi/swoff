/**
 * Generates online-status.{js|ts} - shared online/offline primitive.
 * Emitted when connectivity OR auth is enabled; both features depend on it.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateOnlineStatusCode } from "../../../runtime/online-status.js";

export function generateOnlineStatus(ctx: GeneratorContext): void {
  writeFile(
    ctx,
    `online-status.${ctx.ext}`,
    generateOnlineStatusCode({
      ts: ctx.ext === "ts",
      ext: ctx.ext,
    }),
  );
}