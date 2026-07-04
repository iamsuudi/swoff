/**
 * Generates client-injector.{js|ts} - orchestrator that wires feature modules together.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateClientInjectorCode } from "../../../runtime/client-injector.js";
import { shouldIncludeServerPush } from "../sw-sections/shared.js";

export function generateClientInjector(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";

  const storageThreshold = ctx.config.features.serviceWorker.strategy.storageThreshold;

  const code = generateClientInjectorCode(
    { ts, ext },
    ctx.config.features.pwa.enabled,
    ctx.config.features.mutationQueue.enabled,
    shouldIncludeServerPush(ctx.config),
    ctx.config.features.serviceWorker.navigation.mode,
    ctx.config.features.auth.enabled,
    ctx.config.features.connectivity.enabled || ctx.config.features.auth.enabled,
    ctx.config.features.tagInvalidation.enabled || ctx.config.features.mutationQueue.enabled || ctx.config.features.graphql.enabled,
    storageThreshold,
  );

  writeFile(ctx, `client-injector.${ext}`, code);
}
