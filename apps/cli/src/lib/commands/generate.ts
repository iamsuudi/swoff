import { loadConfigAsync } from "../config/loader.js";
import { validateConfig } from "../config/validator.js";
import { detectProjectLanguage } from "../utils/detect-language.js";
import { generateFiles } from "../generators/swoff-files-generator.js";
import type { GeneratorContext } from "../generators/file-generators/context.js";
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
  for (const err of cfgErrors) {
    log.warn(`Config: ${err}`);
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

  const ctx: GeneratorContext = {
    config,
    projectRoot,
    swoffDir,
    ext,
    generatedFiles,
    frameworkName: config.framework ?? "vanilla",
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

  if (config.features.pwa.enabled) {
    log.normal("");
    log.help(
      `For PWA assets: run 'npx @swoff/assets --source <path>' to generate icons, splash screens, and manifest.json`,
    );
  }

  if (config.features.auth.enabled) {
    log.normal("");
    log.help(`Auth (${config.features.auth.type})`);
    log.normal("  Edit swoff/auth/adapter.ts to match your backend:");
    log.normal("    - toAuthData(): map login response to AuthData");
    log.normal("    - getHeaders(): return auth headers for fetch requests");
    if (config.features.auth.type !== "cookie") {
      log.normal("    - refresh(): implement token/session refresh");
    }
    log.normal("    - fetchUser(): implement fetching current user (/api/me)");
    log.normal("  Use { auth: true } in fetchWithCache for authenticated requests");
  }

  log.normal("");
  log.normal("1. Read swoff/GUIDE.md for documentation links");
  log.normal("2. After each build, run the SW generator:");
  log.normal(
    "   node swoff/sw/generator.js (Add this to your build script if you want it automated)",
  );
}
