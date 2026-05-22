/**
 * Swoff Files Generator
 *
 * Generates framework-agnostic pattern files based on swoff.config.json features.
 * Thin orchestrator - delegates to file-generators for each template.
 *
 * CLI Usage:
 *   node swoff-files-generator.js --project-root <path> --language <ts|js> --config-path <path>
 *
 * Module Usage:
 *   import { generateFiles } from './swoff-files-generator.js';
 *   const files = generateFiles(ctx, (name) => { ... });
 */

import { join } from "path";
import { fileURLToPath } from "url";
import { loadConfig } from "../config/loader.js";
import type { GeneratorContext } from "./file-generators/context.js";
import { generateSwTemplate } from "./file-generators/sw-template.js";
import { generateSwInjector } from "./file-generators/sw-injector.js";
import { generateFetchWrapper } from "./file-generators/fetch-wrapper.js";
import { generateCache } from "./file-generators/cache.js";
import { generateMutationQueue } from "./file-generators/mutation-queue.js";
import { generateStore } from "./file-generators/store.js";
import { generateReconcile } from "./file-generators/reconcile.js";
import { generateBackgroundSync } from "./file-generators/background-sync.js";
import { generateIndexedDB } from "./file-generators/indexeddb.js";
import { generatePwaInstall } from "./file-generators/pwa-install.js";
import { generateManifest } from "./file-generators/manifest.js";
import { generateInvalidationTags } from "./file-generators/invalidation-tags.js";
import { generateSwGeneratorBuild } from "./file-generators/sw-generator-build.js";
import { generateTypeDefinitions } from "./file-generators/type-definitions.js";

interface Step {
  name: string;
  gen: () => void;
  enabled: boolean;
}

export function generateFiles(ctx: GeneratorContext, onFile?: (name: string) => void): string[] {
  const steps: Step[] = [
    { name: "sw-template", gen: () => generateSwTemplate(ctx), enabled: true },
    { name: "sw-injector", gen: () => generateSwInjector(ctx), enabled: ctx.config.features.clientRegistration },
    { name: "fetch-wrapper", gen: () => generateFetchWrapper(ctx), enabled: true },
    { name: "cache", gen: () => generateCache(ctx), enabled: ctx.config.features.tagInvalidation || ctx.config.features.crossTabSync },
    { name: "store", gen: () => generateStore(ctx), enabled: ctx.config.features.mutationQueue },
    { name: "reconcile", gen: () => generateReconcile(ctx), enabled: ctx.config.features.mutationQueue },
    { name: "mutation-queue", gen: () => generateMutationQueue(ctx), enabled: ctx.config.features.mutationQueue },
    { name: "background-sync", gen: () => generateBackgroundSync(ctx), enabled: ctx.config.features.backgroundSync },
    { name: "indexeddb", gen: () => generateIndexedDB(ctx), enabled: ctx.config.features.indexeddb },
    { name: "sw-generator", gen: () => generateSwGeneratorBuild(ctx), enabled: true },
    { name: "swoff.d.ts", gen: () => generateTypeDefinitions(ctx), enabled: ctx.ext === "ts" },
    { name: "pwa-install", gen: () => generatePwaInstall(ctx), enabled: ctx.config.features.pwa },
    { name: "manifest.json", gen: () => generateManifest(ctx), enabled: ctx.config.features.pwa },
    { name: "invalidation-tags", gen: () => generateInvalidationTags(ctx), enabled: ctx.config.features.tagInvalidation },
  ];

  for (const step of steps) {
    if (!step.enabled) continue;
    onFile?.(step.name);
    step.gen();
  }

  return ctx.generatedFiles;
}

// --- CLI entry point ---
const args = process.argv.slice(2);

function getArg(name: string): string | null {
  const idx = args.findIndex((arg) => arg === `--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

if (fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], "file:"))) {
  const projectRoot = getArg("project-root") || process.cwd();
  const language = getArg("language") || "ts";
  const configPath = getArg("config-path") || join(projectRoot, "swoff.config.json");

  const { config } = loadConfig(projectRoot, configPath);

  if (!config.enabled) {
    console.log("Config generation disabled");
    process.exit(0);
  }

  const ext = language === "ts" ? "ts" : "js";
  const swoffDir = join(projectRoot, "swoff");
  const generatedFiles: string[] = [];

  const ctx: GeneratorContext = {
    config,
    projectRoot,
    swoffDir,
    ext,
    generatedFiles,
  };

  const ttyStatus = process.stdout.isTTY
    ? (msg: string) => {
        const cols = process.stdout.columns || 80;
        process.stdout.write(`\r${" ".repeat(cols - 1)}\r  ${msg}`);
      }
    : (msg: string) => console.log(`  ${msg}`);

  console.log(`Generating Swoff files (${language})...`);

  generateFiles(ctx, (name) => ttyStatus(`→ ${name}...`));

  if (process.stdout.isTTY) {
    const cols = process.stdout.columns || 80;
    process.stdout.write(`\r${" ".repeat(cols - 1)}\r`);
  }

  console.log("Generated files:");
  generatedFiles.forEach((file) => console.log(`  ${file}`));
  console.log(`\nTotal: ${generatedFiles.length} files`);
}
