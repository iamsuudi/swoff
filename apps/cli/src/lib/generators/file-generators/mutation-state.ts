/**
 * Generates mutation-state.ts/js — per-mutation state tracking.
 * Provides a lightweight store for tracking individual mutation lifecycle states,
 * enabling useMutation-style hooks and fine-grained mutation status UI.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateMutationStateCode } from "../../../runtime/mutation-state.js";

export function generateMutationState(ctx: GeneratorContext): void {
  writeFile(ctx, `mutation-state.${ctx.ext}`, generateMutationStateCode({ ts: ctx.ext === "ts", ext: ctx.ext }));
}
