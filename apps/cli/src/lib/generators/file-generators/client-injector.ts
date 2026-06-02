/**
 * Generates client-injector.{js|ts} - orchestrator that wires feature modules together.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateClientInjectorCode } from "../../../runtime/client-injector.js";

export function generateClientInjector(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";

  const code = generateClientInjectorCode(
    { ts, ext },
    ctx.config.features.pwa.enabled,
    ctx.config.features.mutationQueue.enabled,
    ctx.config.features.serverPush?.enabled ?? false,
  );

  writeFile(ctx, `client-injector.${ext}`, code);
}
