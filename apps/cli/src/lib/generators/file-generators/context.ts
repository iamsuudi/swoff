/**
 * Shared context for file generators.
 * Contains config, paths, and the generated files tracker.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import type { SwoffConfig } from "../../shared/config-types.js";

const BUNDLER_FRAMEWORKS = new Set([
  "nextjs", "remix", "tanstack-start-react", "astro",
  "nuxt", "sveltekit", "react", "vue", "svelte",
  "qwik", "preact", "angular", "solid", "lit",
  "alpine", "marko", "stimulus", "jquery", "htmx",
  "vanilla",
]);

export function hasBundler(frameworkName: string): boolean {
  return BUNDLER_FRAMEWORKS.has(frameworkName);
}

export interface GeneratorContext {
  config: SwoffConfig;
  projectRoot: string;
  swoffDir: string;
  ext: string;
  generatedFiles: string[];
  frameworkName: string;
  hasBundler: boolean;
  debug?: boolean;
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function writeFile(ctx: GeneratorContext, filename: string, code: string): void {
  const fullPath = join(ctx.swoffDir, filename);
  ensureDir(dirname(fullPath));
  writeFileSync(fullPath, code);
  const relPath = join(ctx.config.build?.swoffPath || "swoff", filename);
  ctx.generatedFiles.push(relPath);
}
