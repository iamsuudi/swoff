import { GeneratorContext, writeFile } from "./context.js";
import { generateMutationQueueCode } from "../../../runtime/mutation-queue.js";

export function generateMutationQueue(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const authEnabled = ctx.config.features.auth.enabled;
  const mqConfig = ctx.config.features.mutationQueue;

  const code = generateMutationQueueCode(
    { ts, ext },
    authEnabled,
    mqConfig.batchSize,
    mqConfig.batchDelayMs,
    mqConfig.retry.maxRetries,
    mqConfig.retry.backoffMs,
  );

  writeFile(ctx, `offline/queue.${ext}`, code);
}
