import { loadConfigAsync } from "../config/loader.js";
import { validateConfig } from "../config/validator.js";
import { detectProjectLanguage } from "../utils/detect-language.js";
import { generateFiles } from "../generators/swoff-files-generator.js";
import type { GeneratorContext } from "../generators/file-generators/context.js";
import { hasBundler } from "../generators/file-generators/context.js";
import { join } from "path";
import { log } from "../cli/logger.js";

export interface GenerateOptions {
  language?: string;
  debug?: boolean;
}

export async function generateCommand(
  projectRoot: string,
  options: GenerateOptions = {},
) {
  const { language, debug } = options;

  const { config, configPath } = await loadConfigAsync(projectRoot);

  if (!configPath) {
    log.warn('No swoff.config.json found. Run "swoff init" first.');
    return;
  }

  const cfgErrors = validateConfig(config as unknown as Record<string, unknown>);
  if (cfgErrors.length > 0) {
    log.error("Configuration validation failed:");
    for (const err of cfgErrors) {
      log.error(`  - ${err}`);
    }
    return;
  }

  log.dim(`Config: ${configPath}`);
  log.dim(`Framework: ${config.framework ?? "vanilla"}`);

  const detectedLang = (language ?? detectProjectLanguage(projectRoot)) as
    | "ts"
    | "js";
  log.dim(`Language: ${detectedLang}`);

  const ext = detectedLang === "ts" ? "ts" : "js";
  const swoffDir = join(projectRoot, "swoff");
  const generatedFiles: string[] = [];

  const fwName = config.framework ?? "vanilla";
  const ctx: GeneratorContext = {
    config,
    projectRoot,
    swoffDir,
    ext,
    generatedFiles,
    frameworkName: fwName,
    hasBundler: hasBundler(fwName),
    debug: debug ?? false,
  };

  try {
    const files = generateFiles(ctx);
    log.success(`Generated ${files.length} supporting files`);
  } catch (err: unknown) {
    log.error(
      `File generation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return;
  }

  log.success("Generation complete!");

  if (!config.build.precacheDirs || Object.keys(config.build.precacheDirs).length === 0) {
    log.normal("");
    log.warn("No directories configured for precaching. Only explicit fallback routes will be precached.");
    log.help("  Add precacheDirs to your swoff.config.json build section to precache assets:");
    log.help(`  "precacheDirs": { "${config.build.outputDir}": { "prefix": "/" } }`);
  }

  if (config.features.pwa.enabled) {
    log.normal("");
    log.help(
      `For PWA assets: run 'npx @swoff/assets --source <path>' to generate icons, splash screens, and manifest.json`,
    );
  }

  if (config.features.auth.enabled && hasBundler(fwName)) {
    log.normal("");
    log.help(`Auth (${config.features.auth.type})`);
    log.normal("  Edit swoff/auth/adapter.ts to match your backend:");
    log.normal("    - getHeaders(): return auth headers for fetch requests");
    if (config.features.auth.type !== "cookie") {
      log.normal("    - refresh(): implement token/session refresh");
    }
    log.normal("    - fetchUser(): implement fetching current user (/api/me)");
    log.normal("  Use { auth: true } in fetchWithCache for authenticated requests");
  }

  log.normal("");
  log.normal("1. After each build, run the SW generator:");
  log.normal(
    "   node swoff/sw/generator.js (Add this to your build script if you want it automated)",
  );
}
