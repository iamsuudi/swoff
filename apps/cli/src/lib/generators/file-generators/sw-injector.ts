/**
 * Generates sw/injector.{js|ts} - core SW registration logic only.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateSwInjectorCode } from "../../../runtime/sw-injector.js";

export function generateSwInjector(ctx: GeneratorContext): void {
  writeFile(
    ctx,
    `sw/injector.${ctx.ext}`,
    generateSwInjectorCode({
      ts: ctx.ext === "ts",
      ext: ctx.ext,
      autoActivate: ctx.config.features.serviceWorker.autoActivate,
      swUrl: ctx.config.build?.swUrl,
    }),
  );
}
