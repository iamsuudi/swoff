/**
 * generate command - orchestrates SW and file generation.
 * Uses direct imports (no subprocess spawning) for a single status line.
 */

import { log } from "../cli/logger.js";
import { loadConfig } from "../config/loader.js";
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

  const frameworkName = config.framework ?? "vanilla";
  log.info(`Framework: ${frameworkName}`);

  const detectedLang = (language ?? detectProjectLanguage(projectRoot)) as "ts" | "js";
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

  log.normal("");
  log.help("📖  Read swoff/GUIDE.md for documentation links");
  log.help("📖  See docs/ files in swoff for targeted feature help");
  log.normal("");
  log.help("⚙️  After each build, run the SW generator:");
  log.help("   node swoff/sw/generator.js");
  log.help("   (Add this to your build script if you want it automated)");
}
