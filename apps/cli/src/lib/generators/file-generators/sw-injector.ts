/**
 * Generates sw/injector.{js|ts} - core SW registration logic only.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateSwInjectorCode } from "../../../runtime/sw-injector.js";

export function generateSwInjector(ctx: GeneratorContext): void {
  const v = ctx.config.features.serviceWorker.version;
  const versionEnabled = v !== "hash";

  writeFile(
    ctx,
    `sw/injector.${ctx.ext}`,
    generateSwInjectorCode({
      ts: ctx.ext === "ts",
      ext: ctx.ext,
      autoUpdate: ctx.config.features.serviceWorker.autoUpdate,
      autoActivate: ctx.config.features.serviceWorker.autoActivate,
      versionEnabled,
      swFilename: ctx.config.build?.swFilename || "sw",
    }),
  );
}
