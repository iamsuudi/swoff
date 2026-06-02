/**
 * generate command - orchestrates SW and file generation.
 * Uses direct imports (no subprocess spawning) for a single status line.
 */

import { log } from "../cli/logger.js";
import { loadConfigAsync } from "../config/loader.js";
import { detectProjectLanguage } from "../utils/detect-language.js";
import { statusLine, clearStatusLine } from "../utils/tty-status.js";
import { generateSW } from "../generators/sw-generator.js";
import { generateFiles } from "../generators/swoff-files-generator.js";
import type { GeneratorContext } from "../generators/file-generators/context.js";
import { join } from "path";

export interface GenerateOptions {
  swOnly?: boolean;
  filesOnly?: boolean;
  language?: string;
  continueOnSwError?: boolean;
}

export async function generateCommand(
  projectRoot: string,
  options: GenerateOptions = {},
) {
  const {
    swOnly = false,
    filesOnly = false,
    language,
    continueOnSwError = false,
  } = options;

  // log.header("Generating Swoff Files");

  const { config, configPath } = await loadConfigAsync(projectRoot);

  if (!configPath) {
    log.warn('No swoff.config.json found. Run "swoff init" first.');
    return;
  }

  log.info(`Config: ${configPath}`);

  const frameworkName = config.framework ?? "vanilla";
  log.info(`Framework: ${frameworkName}`);

  const detectedLang = (language ?? detectProjectLanguage(projectRoot)) as
    | "ts"
    | "js";
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
      if (!continueOnSwError) {
        log.error(
          "Generation aborted. Fix the issue and re-run. Use --continue-on-sw-error to skip SW and continue with files.",
        );
        process.exit(1);
      }
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
      frameworkName,
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

  if (config.features.pwa.enabled) {
    log.normal("");
    log.help(
      "PWA assets: run 'npx @swoff/cli assets --source <path>' to generate icons and splash screens",
    );
  }

  log.normal("");
  log.help("1. Read swoff/GUIDE.md for documentation links");
  log.normal("");
  log.help("2. After each build, run the SW generator:");
  log.help("  node swoff/sw/generator.js");
  log.help("  (Add this to your build script if you want it automated)");
}
