/**
 * generate command - orchestrates SW and file generation.
 * Uses direct imports (no subprocess spawning) for a single status line.
 */

import { log } from "../cli/logger.js";
import { loadConfig } from "../config/loader.js";
import { detectProjectLanguage } from "../utils/detect-language.js";
import { generateSW } from "../generators/sw-generator.js";
import { generateFiles } from "../generators/swoff-files-generator.js";
import type { GeneratorContext } from "../generators/file-generators/context.js";
import { join } from "path";

export interface GenerateOptions {
  swOnly?: boolean;
  filesOnly?: boolean;
  language?: string;
}

function statusLine(msg: string) {
  if (process.stdout.isTTY) {
    const cols = process.stdout.columns || 80;
    process.stdout.write(`\r${" ".repeat(cols - 1)}\r  ${msg}`);
  } else {
    console.log(`  ${msg}`);
  }
}

function clearStatusLine() {
  if (process.stdout.isTTY) {
    const cols = process.stdout.columns || 80;
    process.stdout.write(`\r${" ".repeat(cols - 1)}\r`);
  }
}

export async function generateCommand(
  projectRoot: string,
  options: GenerateOptions = {},
) {
  const { swOnly = false, filesOnly = false, language } = options;

  log.header("Generating Swoff Files");

  const { config, configPath } = loadConfig(projectRoot);

  if (!configPath) {
    log.warn('No swoff.config.json found. Run "swoff init" first.');
    return;
  }

  log.info(`Config: ${configPath}`);

  const detectedLang = language ?? detectProjectLanguage(projectRoot);
  log.info(`Language: ${detectedLang}`);

  if (!filesOnly) {
    statusLine("→ Service worker...");
    try {
      await generateSW({
        projectRoot,
        configPath,
        onStatus: (msg) => statusLine(msg),
      });
    } catch (err: unknown) {
      clearStatusLine();
      log.error(
        `Service worker failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (!swOnly) {
    const ext = detectedLang === "ts" ? "ts" : "js";
    const swoffDir = join(projectRoot, "swoff");
    const generatedFiles: string[] = [];

    const ctx: GeneratorContext = {
      config,
      projectRoot,
      swoffDir,
      ext,
      generatedFiles,
    };

    statusLine("→ Files...");
    try {
      const files = generateFiles(ctx, (name) => statusLine(`→ ${name}...`));
      clearStatusLine();
      log.success(`Generated ${files.length} supporting files`);
    } catch (err: unknown) {
      clearStatusLine();
      log.error(
        `File generation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  log.success("Generation complete!");
  log.normal("\nNext steps:");
  log.help("1. Import initServiceWorker in your app entry point:");
  log.help("   import { initServiceWorker } from 'swoff/sw-injector.js';");
  log.help("   initServiceWorker();");
  log.help("2. Use the fetch wrapper for API calls:");
  log.help("   import { fetchWithCache } from 'swoff/fetch-wrapper.js';");
  log.help(
    "   const data = await fetchWithCache('/api/data').then(r => r.json());",
  );
  log.help(
    '3. Add to your build script: "build": "your-build && node swoff/sw-generator.js"',
  );
  log.help("4. Read the docs: https://swoff.netlify.app/docs");
}
