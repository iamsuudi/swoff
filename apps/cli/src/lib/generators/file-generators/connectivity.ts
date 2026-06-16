/**
 * Generates connectivity.{js|ts} - core connectivity logic only.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateConnectivityCode } from "../../../runtime/connectivity.js";

export function generateConnectivity(ctx: GeneratorContext): void {
  writeFile(
    ctx,
    `connectivity.${ctx.ext}`,
    generateConnectivityCode({
      ts: ctx.ext === "ts",
      ext: ctx.ext,
    }),
  );
}
