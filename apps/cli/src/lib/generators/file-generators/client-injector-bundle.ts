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
  const sw = ctx.config.features.serviceWorker;

  const code = generateClientInjectorBundleCode(
    { ts, ext },
    sw.autoActivate,
    ctx.config.build?.swFilename || "sw",
    ctx.config.build?.swUrl,
    ctx.config.features.pwa.enabled,
    sw.navigation.mode,
    ctx.config.features.auth.enabled,
    ctx.config.features.mutationQueue.enabled,
    ctx.config.features.connectivity.enabled || ctx.config.features.auth.enabled,
    ctx.config.features.tagInvalidation.enabled || ctx.config.features.mutationQueue.enabled || ctx.config.features.graphql.enabled,
  );

  writeFile(ctx, `client-injector.bundle.${ext}`, code);
}
