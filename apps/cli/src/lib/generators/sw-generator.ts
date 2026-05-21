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
 *   import { generate } from './sw-generator.js';
 *   generate({ projectRoot: '/path/to/project' });
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadConfig } from "../config/loader.js";
import { assembleSW } from "./sw-sections/assemble-sw.js";
import type { SwoffConfig } from "../shared/config-types.js";

interface GeneratorOptions {
  projectRoot?: string;
  packageDir?: string;
  configPath?: string;
}

const args = process.argv.slice(2);
const projectRootArg = args.findIndex((arg) => arg === "--project-root");
const packageDirArg = args.findIndex((arg) => arg === "--package-dir");
const configPathArg = args.findIndex((arg) => arg === "--config-path");

const passedProjectRoot = projectRootArg !== -1 ? args[projectRootArg + 1] : null;
const passedPackageDir = packageDirArg !== -1 ? args[packageDirArg + 1] : null;
const passedConfigPath = configPathArg !== -1 ? args[configPathArg + 1] : null;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = passedPackageDir || join(scriptDir, "..");
const projectRoot = passedProjectRoot || process.cwd();

export async function generate(options: GeneratorOptions = {}): Promise<void> {
  const optProjectRoot = options.projectRoot || projectRoot;
  const optConfigPath = options.configPath || passedConfigPath;

  const pkgPath = join(optProjectRoot, "package.json");
  let pkg = { version: "1.0.0" };

  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    } catch {
      console.warn("Could not read package.json, using default version");
    }
  }

  const { config, configPath, configSource } = loadConfig(optProjectRoot, optConfigPath ?? undefined);

  if (!config.enabled) {
    console.log("Swoff config generation disabled. Using custom code mode.");
    return;
  }

  const version = config.version === "from-package" ? pkg.version || "1.0.0" : config.version;
  const sw = assembleSW(config, version);

  const outputDir = join(optProjectRoot, config.build.outputDir);
  const swFilename = config.build.swFilename;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  try {
    writeFileSync(join(outputDir, `${swFilename}-v${version}.js`), sw);
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

    console.log("Service worker generated successfully.");
    console.log(`Output: ${outputDir}/${swFilename}-v${version}.js`);
    console.log(`Version info: ${outputDir}/version.json`);
    console.log(`Configuration source: ${configSource}`);
  } catch (err) {
    console.error(`Error writing files: ${err instanceof Error ? err.message : String(err)}`);
    console.log("Make sure the output directory exists:");
    console.log(`  mkdir -p ${outputDir}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export default { generate };
