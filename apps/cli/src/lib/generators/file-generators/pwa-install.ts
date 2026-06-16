/**
 * Generates pwa/ files — injector and prompt.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generatePwaInjectorCode } from "../../../runtime/pwa-injector.js";
import { generatePwaPromptCode } from "../../../runtime/pwa-prompt.js";

export function generatePwaInstall(ctx: GeneratorContext): void {
  const opts = { ts: ctx.ext === "ts", ext: ctx.ext };

  writeFile(ctx, `pwa/injector.${ctx.ext}`, generatePwaInjectorCode(opts));

  writeFile(ctx, `pwa/prompt.${ctx.ext}`, generatePwaPromptCode({
    ...opts,
    preventDefaultInstall: ctx.config.features.pwa.preventDefaultInstall,
  }));
}
