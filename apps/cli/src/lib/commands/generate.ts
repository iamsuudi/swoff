/**
 * generate command - orchestrates SW and file generation.
 */

import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { log } from "../cli/logger.js";
import { loadConfig } from "../config/loader.js";
import { detectProjectLanguage } from "../utils/detect-language.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = join(__dirname, "../../..");

export interface GenerateOptions {
  swOnly?: boolean;
  filesOnly?: boolean;
  language?: string;
}

export async function generateCommand(projectRoot: string, options: GenerateOptions = {}) {
  const { swOnly = false, filesOnly = false, language } = options;

  log.header("Generating Swoff Files");

  const { config, configPath } = loadConfig(projectRoot);

  if (!configPath) {
    log.warn('No swoff.config.json found. Run "swoff init" first.');
    return;
  }

  log.info(`Using config: ${configPath}`);

  const detectedLang = language ?? detectProjectLanguage(projectRoot);
  log.info(`Detected project language: ${detectedLang}`);

  if (!filesOnly) {
    log.info("Generating service worker...");
    try {
      await runGenerator("sw-generator.js", [
        "--project-root", projectRoot,
        "--package-dir", packageDir,
        "--config-path", configPath,
      ]);
    } catch (err: unknown) {
      log.error(`Service worker generation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!swOnly) {
    log.info("Generating supporting files...");
    try {
      await runGenerator("swoff-files-generator.js", [
        "--project-root", projectRoot,
        "--package-dir", packageDir,
        "--language", detectedLang,
        "--config-path", configPath,
      ]);
    } catch (err: unknown) {
      log.error(`File generation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  log.success("Generation complete!");
  log.info("Next steps:");
  log.help("1. Import the SW injector in your app entry point:");
  log.help("   import { initServiceWorker, shouldRegisterSW } from './swoff/sw-injector.js';");
  log.help("   if (shouldRegisterSW()) initServiceWorker();");
  log.help("2. Use the fetch wrapper for API calls:");
  log.help("   import { fetchWithCache } from './swoff/fetch-wrapper.js';");
  log.help("   const data = await fetchWithCache('/api/data', { tags: ['data'] }).then(r => r.json());");
  log.help("3. Add to your build script:");
  log.help('   "build": "your-build && node swoff/sw-generator.js"');
  log.help("4. Read the docs: https://swoff.netlify.app/docs");
}

function runGenerator(generatorName: string, extraArgs: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const generatorPath = join(packageDir, "dist", "lib", "generators", generatorName);

    if (!existsSync(generatorPath)) {
      reject(new Error(`Generator not found: ${generatorPath}`));
      return;
    }

    const proc = spawn("node", [generatorPath, ...extraArgs], {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Generator exited with code ${code}`));
    });
    proc.on("error", (err) => reject(err));
  });
}
