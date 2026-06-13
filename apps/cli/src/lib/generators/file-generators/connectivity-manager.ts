/**
 * Generates connectivity-manager.{js|ts} - core connectivity manager logic only.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateConnectivityManagerCode } from "../../../runtime/connectivity-manager.js";

export function generateConnectivityManager(ctx: GeneratorContext): void {
  writeFile(
    ctx,
    `connectivity-manager.${ctx.ext}`,
    generateConnectivityManagerCode({
      ts: ctx.ext === "ts",
      ext: ctx.ext,
    }),
  );
}
