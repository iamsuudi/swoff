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
import { generateClientInjector } from "./file-generators/client-injector.js";
import { generateFetchWrapper } from "./file-generators/fetch-wrapper.js";
import { generateCache } from "./file-generators/cache.js";
import { generateMutationQueue } from "./file-generators/mutation-queue.js";


import { generateBackgroundSync } from "./file-generators/background-sync.js";
import { generatePwaInstall } from "./file-generators/pwa-install.js";
import { generateManifest } from "./file-generators/manifest.js";
import { generateInvalidationTags } from "./file-generators/invalidation-tags.js";
import { generatePush } from "./file-generators/push.js";
import { generateMutationState } from "./file-generators/mutation-state.js";
import { generateAuthStore } from "./file-generators/auth-store.js";
import { generateAuthUser } from "./file-generators/auth-user.js";
import { generateAuthState } from "./file-generators/auth-state.js";
import { generateSwGeneratorBuild } from "./file-generators/sw-generator-build.js";
import { generateGqlWrapper } from "./file-generators/gql-wrapper.js";
import { generateTypeDefinitions } from "./file-generators/type-definitions.js";
import { generateHooks } from "./file-generators/generate-hooks.js";
import { generateGuide } from "./file-generators/guide-generator.js";
import { generateReadme } from "./file-generators/quick-readme.js";

interface Step {
  name: string;
  gen: () => void;
  enabled: boolean;
}

export function generateFiles(ctx: GeneratorContext, onFile?: (name: string) => void): string[] {
  const steps: Step[] = [
    { name: "sw-template", gen: () => generateSwTemplate(ctx), enabled: true },
    { name: "sw-injector", gen: () => generateSwInjector(ctx), enabled: true },
    { name: "client-injector", gen: () => generateClientInjector(ctx), enabled: true },
    { name: "fetch-wrapper", gen: () => generateFetchWrapper(ctx), enabled: true },
    { name: "cache", gen: () => generateCache(ctx), enabled: ctx.config.features.tagInvalidation },

    { name: "mutation-queue", gen: () => generateMutationQueue(ctx), enabled: ctx.config.features.mutationQueue.enabled },
    { name: "mutation-state", gen: () => generateMutationState(ctx), enabled: ctx.config.features.mutationQueue.enabled },
    { name: "background-sync", gen: () => generateBackgroundSync(ctx), enabled: ctx.config.features.backgroundSync },
    { name: "auth-store", gen: () => generateAuthStore(ctx), enabled: ctx.config.features.auth.enabled },
    { name: "auth-user", gen: () => generateAuthUser(ctx), enabled: ctx.config.features.auth.enabled },
    { name: "auth-state", gen: () => generateAuthState(ctx), enabled: ctx.config.features.auth.enabled },
    { name: "sw-generator", gen: () => generateSwGeneratorBuild(ctx), enabled: true },
    { name: "swoff.d.ts", gen: () => generateTypeDefinitions(ctx), enabled: ctx.ext === "ts" },
    { name: "pwa-install", gen: () => generatePwaInstall(ctx), enabled: ctx.config.features.pwa.enabled },
    { name: "manifest.json", gen: () => generateManifest(ctx), enabled: ctx.config.features.pwa.enabled },
    { name: "invalidation-tags", gen: () => generateInvalidationTags(ctx), enabled: ctx.config.features.tagInvalidation },
    { name: "gql-wrapper", gen: () => generateGqlWrapper(ctx), enabled: ctx.config.features.graphql.enabled },
    { name: "push", gen: () => generatePush(ctx), enabled: ctx.config.features.pushNotifications?.enabled ?? false },
    { name: "hooks", gen: () => generateHooks(ctx), enabled: ctx.config.framework === "react" },
    { name: "GUIDE.md", gen: () => generateGuide(ctx), enabled: true },
    { name: "README.md", gen: () => generateReadme(ctx), enabled: true },
  ];

  for (const step of steps) {
    if (!step.enabled) continue;
    onFile?.(step.name);
    step.gen();
  }

  return ctx.generatedFiles;
}

// --- CLI entry point ---
if (fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], "file:"))) {
  const args = process.argv.slice(2);
  const getArg = (name: string): string | null => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 ? args[idx + 1] : null;
  };

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
    frameworkName: config.framework ?? "vanilla",
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
