/**
 * Shared context for file generators.
 * Contains config, paths, and the generated files tracker.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { SwoffConfig } from "../../shared/config-types.js";

export interface GeneratorContext {
  config: SwoffConfig;
  projectRoot: string;
  swoffDir: string;
  ext: string;
  generatedFiles: string[];
}

export function ensureSwoffDir(ctx: GeneratorContext): void {
  if (!existsSync(ctx.swoffDir)) mkdirSync(ctx.swoffDir, { recursive: true });
}

export function writeFile(ctx: GeneratorContext, filename: string, code: string): void {
  ensureSwoffDir(ctx);
  writeFileSync(join(ctx.swoffDir, filename), code);
  ctx.generatedFiles.push(`swoff/${filename}`);
}
