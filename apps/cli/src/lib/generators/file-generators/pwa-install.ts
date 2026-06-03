/**
 * Generates pwa/ files — injector, prompt, and index barrel.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generatePwaInjectorCode } from "../../../runtime/pwa-injector.js";
import { generatePwaPromptCode } from "../../../runtime/pwa-prompt.js";
import { generatePwaIndexCode } from "../../../runtime/pwa-index.js";

export function generatePwaInstall(ctx: GeneratorContext): void {
  const opts = { ts: ctx.ext === "ts", ext: ctx.ext };

  writeFile(ctx, `pwa/injector.${ctx.ext}`, generatePwaInjectorCode({
    ...opts,
    preventDefaultInstall: ctx.config.features.pwa.preventDefaultInstall,
  }));

  writeFile(ctx, `pwa/prompt.${ctx.ext}`, generatePwaPromptCode(opts));

  writeFile(ctx, `pwa/index.${ctx.ext}`, generatePwaIndexCode(opts));
}
