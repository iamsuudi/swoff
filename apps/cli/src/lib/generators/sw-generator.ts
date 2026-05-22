/**
 * Swoff Service Worker Generator
 *
 * Generates a service worker based on swoff.config.json configuration.
 * Thin orchestrator - delegates to sw-sections for code generation.
 *
 * CLI Usage:
 *   node sw-generator.js [--project-root <path>] [--package-dir <path>] [--config-path <path>]
 *
 * Module Usage:
 *   import { generateSW } from './sw-generator.js';
 *   await generateSW({ projectRoot: '/path/to/project', onStatus: (msg) => {...} });
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadConfig } from "../config/loader.js";
import { assembleSW } from "./sw-sections/assemble-sw.js";

interface GeneratorOptions {
  projectRoot?: string;
  configPath?: string;
  onStatus?: (msg: string) => void;
}

const args = process.argv.slice(2);
const projectRootArg = args.findIndex((arg) => arg === "--project-root");
const configPathArg = args.findIndex((arg) => arg === "--config-path");

const passedProjectRoot = projectRootArg !== -1 ? args[projectRootArg + 1] : null;
const passedConfigPath = configPathArg !== -1 ? args[configPathArg + 1] : null;

const projectRoot = passedProjectRoot || process.cwd();

export async function generateSW(options: GeneratorOptions = {}): Promise<{ version: string; outputFile: string }> {
  const optProjectRoot = options.projectRoot || projectRoot;
  const optConfigPath = options.configPath || passedConfigPath || undefined;
  const status = options.onStatus || console.log;

  const pkgPath = join(optProjectRoot, "package.json");
  let pkg = { version: "1.0.0" };

  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    } catch {
      status("Could not read package.json, using default version");
    }
  }

  const { config, configSource } = loadConfig(optProjectRoot, optConfigPath);

  if (!config.enabled) {
    status("Swoff config generation disabled. Using custom code mode.");
    return { version: "", outputFile: "" };
  }

  const version = config.version === "from-package" ? pkg.version || "1.0.0" : config.version;
  const sw = assembleSW(config, version);

  const outputDir = join(optProjectRoot, config.build.outputDir);
  const swFilename = config.build.swFilename;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = `${swFilename}-v${version}.js`;

  try {
    writeFileSync(join(outputDir, outputFile), sw);
    writeFileSync(
      join(outputDir, "version.json"),
      JSON.stringify(
        {
          version,
          minSupportedVersion: config.minSupportedVersion,
          generatedAt: new Date().toISOString(),
          configEnabled: config.enabled,
          configSource,
        },
        null,
        2,
      ),
    );

    status(`✓ ${outputDir}/${outputFile}`);
  } catch (err) {
    status(`Error writing files: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { version, outputFile };
}

if (fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], "file:"))) {
  (async () => {
    const ttyStatus = process.stdout.isTTY
      ? (msg: string) => {
          const cols = process.stdout.columns || 80;
          process.stdout.write(`\r${" ".repeat(cols - 1)}\r  ${msg}`);
        }
      : (msg: string) => console.log(`  ${msg}`);

    console.log("Generating service worker...");
    await generateSW({ onStatus: ttyStatus });
    process.stdout.write("\n");
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export default { generateSW };
