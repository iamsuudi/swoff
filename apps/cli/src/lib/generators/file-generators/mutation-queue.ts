import { GeneratorContext, writeFile } from "./context.js";
import { generateMutationQueueCode } from "../../../runtime/mutation-queue.js";

export function generateMutationQueue(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const authEnabled = ctx.config.features.auth.enabled;
  const caching = ctx.config.features.caching;
  const mqConfig = caching.mutationQueue;

  const code = generateMutationQueueCode(
    { ts, ext },
    authEnabled,
    caching.tagInvalidation.enabled,
    mqConfig.batchSize,
    mqConfig.batchDelayMs,
    mqConfig.retry.maxRetries,
    mqConfig.retry.backoffMs,
    mqConfig.retry.maxBackoffMs,
    mqConfig.retry.jitterMs,
  );

  writeFile(ctx, `mutation/queue.${ext}`, code);
}
