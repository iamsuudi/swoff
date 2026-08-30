/**
 * Generates client-injector.bundle.{js|ts} — a self-contained IIFE that
 * auto-initializes the SW, connectivity heartbeat, and basic event listeners.
 * No imports, no bundler needed — just <script src="...">.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateClientInjectorBundleCode } from "../../../runtime/client-injector-bundle.js";

export function generateClientInjectorBundle(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const caching = ctx.config.features.caching;

  const storageThreshold = caching.strategy.storageThreshold;

  const code = generateClientInjectorBundleCode(
    { ts, ext },
    ctx.config.features.serviceWorker.autoActivate,
    ctx.config.build?.swUrl,
    ctx.config.features.pwa.enabled,
    caching.navigation.mode,
    ctx.config.features.auth.enabled,
    caching.mutationQueue.enabled,
    ctx.config.features.connectivity.enabled,
    caching.tagInvalidation.enabled,
    caching.enabled,
    storageThreshold,
    ctx.config.features.connectivity.enabled || ctx.config.features.auth.enabled,
  );

  writeFile(ctx, `client-injector.bundle.${ext}`, code);
}
