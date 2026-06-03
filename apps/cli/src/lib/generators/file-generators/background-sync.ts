/**
 * Generates background-sync.js - Background Sync API registration.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateBackgroundSyncCode } from "../../../runtime/background-sync.js";

export function generateBackgroundSync(ctx: GeneratorContext): void {
  writeFile(ctx, `offline/sync.${ctx.ext}`, generateBackgroundSyncCode({ ts: ctx.ext === "ts", ext: ctx.ext }));
}
