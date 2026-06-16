/**
 * Generates pwa/ files — prompt.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generatePwaPromptCode } from "../../../runtime/pwa-prompt.js";

export function generatePwaInstall(ctx: GeneratorContext): void {
  const opts = { ts: ctx.ext === "ts", ext: ctx.ext };

  writeFile(ctx, `pwa/prompt.${ctx.ext}`, generatePwaPromptCode({
    ...opts,
    preventDefaultInstall: ctx.config.features.pwa.preventDefaultInstall,
  }));
}
