/**
 * Generates swoff-api.bundle.{js|ts} — a self-contained IIFE that exposes
 * the full Swoff API on window.swoff for no-bundler users (vanilla, HTMX,
 * Laravel, Django, Go, Rails).
 *
 * Requires client-injector.bundle.js to be loaded first for SW registration.
 *
 * Usage:
 *   <script src="/swoff/client-injector.bundle.js"></script>
 *   <script src="/swoff/swoff-api.bundle.js"></script>
 *   <script>
 *     swoff.fetchWithCache("/api/todos").then(r => r.json());
 *     swoff.invalidateByTag("todos");
 *   </script>
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateSwoffApiBundleCode } from "../../../runtime/swoff-api-bundle.js";

export function generateSwoffApiBundle(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const caching = ctx.config.features.caching;
  const mq = caching.mutationQueue;
  const ti = caching.tagInvalidation;

  const code = generateSwoffApiBundleCode(
    { ts: ext === "ts", ext },
    {
      cachingEnabled: caching.enabled,
      tagInvalidationEnabled: caching.tagInvalidation.enabled,
      authEnabled: ctx.config.features.auth.enabled,
      authType: ctx.config.features.auth.type,
      authRoutePaths: ctx.config.features.auth.routePaths,
      mutationQueueEnabled: mq.enabled,
      mutationQueueBatchSize: mq.batchSize,
      mutationQueueBatchDelayMs: mq.batchDelayMs,
      mutationQueueMaxRetries: mq.retry.maxRetries,
      mutationQueueRetryBackoffMs: mq.retry.backoffMs,
      mutationQueueRetryMaxBackoffMs: mq.retry.maxBackoffMs,
      mutationQueueRetryJitterMs: mq.retry.jitterMs,
      pwaEnabled: ctx.config.features.pwa.enabled,
      pwaPreventDefaultInstall: ctx.config.features.pwa.preventDefaultInstall,
      requestBatchWindowMs: caching.requestBatchWindowMs,
      tagInvalidationSkipPrefixes: ti.skipPrefixes ?? [],
      tagInvalidationPatterns: ti.patterns ?? {},
      tagInvalidationSingularization: ti.singularization ?? {},
      tagInvalidationCascading: ti.cascading ?? {},
      gqlEnabled: caching.graphql.enabled,
      gqlEndpoints: caching.graphql.endpoints ?? [],
      pushNotificationsEnabled: ctx.config.features.pushNotifications,
      serverPushEnabled: caching.serverPush.enabled,
      serverPushType: caching.serverPush.type,
      serverPushEndpoint: caching.serverPush.endpoint,
      serverPushReconnectDelayMs: caching.serverPush.reconnectDelayMs,
    },
  );

  writeFile(ctx, `swoff-api.bundle.${ext}`, code);
}
