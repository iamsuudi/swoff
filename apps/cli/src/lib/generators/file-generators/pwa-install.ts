/**
 * Generates pwa-install.{js|ts} - PWA install prompt utility.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generatePwaInstallCode } from "../../../runtime/pwa-install.js";

export function generatePwaInstall(ctx: GeneratorContext): void {
  writeFile(ctx, `pwa/install.${ctx.ext}`, generatePwaInstallCode({
    ts: ctx.ext === "ts",
    ext: ctx.ext,
    preventDefaultInstall: ctx.config.features.pwa.preventDefaultInstall,
  }));
}
