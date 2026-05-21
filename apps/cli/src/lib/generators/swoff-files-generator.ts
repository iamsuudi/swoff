/**
 * Swoff Files Generator
 *
 * Generates framework-agnostic pattern files based on swoff.config.json features.
 * Thin orchestrator - delegates to file-generators for each template.
 *
 * CLI Usage:
 *   node swoff-files-generator.js --project-root <path> --package-dir <path> --language <ts|js> --config-path <path>
 */

import { existsSync } from "fs";
import { join, dirname } from "path";
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

const args = process.argv.slice(2);

function getArg(name: string): string | null {
  const idx = args.findIndex((arg) => arg === `--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const projectRoot = getArg("project-root") || process.cwd();
const packageDir = getArg("package-dir") || join(dirname(fileURLToPath(import.meta.url)), "../..");
const language = getArg("language") || "ts";
const configPath = getArg("config-path") || join(projectRoot, "swoff.config.json");

const { config } = loadConfig(projectRoot, configPath);

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

console.log("Generating Swoff files...");
console.log(`Language: ${language}`);
console.log(`Project: ${projectRoot}`);
console.log("");

if (!config.enabled) {
  console.log("Config generation disabled");
  process.exit(0);
}

console.log("Generating pattern files...");

generateSwTemplate(ctx);
console.log("  sw-template");

if (config.features.clientRegistration) {
  generateSwInjector(ctx);
  console.log("  sw-injector");
}

generateFetchWrapper(ctx);
console.log("  fetch-wrapper");

if (config.features.tagInvalidation || config.features.crossTabSync) {
  generateCache(ctx);
  console.log("  cache");
}

if (config.features.mutationQueue) {
  generateStore(ctx);
  console.log("  store");
  generateReconcile(ctx);
  console.log("  reconcile");
  generateMutationQueue(ctx);
  console.log("  mutation-queue");
}

if (config.features.backgroundSync) {
  generateBackgroundSync(ctx);
  console.log("  background-sync");
}

if (config.features.indexeddb) {
  generateIndexedDB(ctx);
  console.log("  indexeddb");
}

generateSwGeneratorBuild(ctx);
console.log("  sw-generator");

generateTypeDefinitions(ctx);
console.log("  swoff.d.ts");

if (config.features.pwa) {
  generatePwaInstall(ctx);
  console.log("  pwa-install");
  generateManifest(ctx);
  console.log("  manifest.json");
}

if (config.features.tagInvalidation) {
  generateInvalidationTags(ctx);
  console.log("  invalidation-tags");
}

console.log("\nGenerated files:");
generatedFiles.forEach((file) => console.log(`  ${file}`));
console.log(`\nTotal: ${generatedFiles.length} files`);
