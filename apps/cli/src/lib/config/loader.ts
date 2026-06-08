/**
 * Config loader - reads and merges swoff.config.json/JS with defaults.
 * Eliminates duplicated config-loading logic across CLI commands and generators.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { defaultConfig, mergeConfigs, CONFIG_VERSION, type SwoffConfig } from "../shared/config-types.js";
import { log } from "../cli/logger.js";

export interface LoadConfigResult {
  config: SwoffConfig;
  configPath: string | null;
  configSource: string;
}

function checkConfigVersion(config: SwoffConfig): void {
  if (config.configVersion === undefined) {
    log.warn(
      "Config is missing configVersion — the format may have changed since it was created.\n" +
      "  Add \"configVersion\": 1 to your swoff.config.json to suppress this warning.",
    );
  } else if (config.configVersion > CONFIG_VERSION) {
    log.warn(
      `Config has configVersion ${config.configVersion}, but this CLI version supports up to ${CONFIG_VERSION}.\n` +
      "  Some settings may not be recognized. Upgrade @swoff/cli for full compatibility.",
    );
  }
}

/**
 * Load config from project root. Tries JSON first, then JS.
 * Falls back to defaults if no config found or parse fails.
 */
export function loadConfig(projectRoot: string, explicitPath?: string): LoadConfigResult {
  const configFiles = ["swoff.config.json", "swoff.config.js"];

  // If an explicit path was provided, use it
  if (explicitPath && existsSync(explicitPath)) {
    if (explicitPath.endsWith(".json")) {
      try {
        const raw = JSON.parse(readFileSync(explicitPath, "utf8"));
        const config = mergeConfigs(defaultConfig, raw);
        checkConfigVersion(config);
        return { config, configPath: explicitPath, configSource: "JSON" };
      } catch {
        log.warn(`Failed to parse explicit config "${explicitPath}" — falling back to defaults`);
        return { config: defaultConfig, configPath: null, configSource: "defaults" };
      }
    }
  }

  // Try each config file in order
  for (const file of configFiles) {
    const path = join(projectRoot, file);
    if (!existsSync(path)) continue;

    if (file.endsWith(".json")) {
      try {
        const raw = JSON.parse(readFileSync(path, "utf8"));
        const config = mergeConfigs(defaultConfig, raw);
        checkConfigVersion(config);
        return { config, configPath: path, configSource: "JSON" };
      } catch {
        log.warn(`Failed to parse "${path}" — falling back to defaults`);
      }
    }

    }

    return { config: defaultConfig, configPath: null, configSource: "defaults" };
}

/**
 * Async version that also tries to load .js configs via dynamic import.
 */
export async function loadConfigAsync(projectRoot: string, explicitPath?: string): Promise<LoadConfigResult> {
  // Handle explicit JS path directly
  if (explicitPath && existsSync(explicitPath) && explicitPath.endsWith(".js")) {
    try {
      const fileUrl = `file://${explicitPath}`;
      const mod = await import(fileUrl);
      const raw = (mod.default || mod) as Partial<SwoffConfig>;
      const config = mergeConfigs(defaultConfig, raw);
      checkConfigVersion(config);
      return { config, configPath: explicitPath, configSource: "JavaScript" };
    } catch {
      log.warn(`Failed to load JS config "${explicitPath}" — falling back to defaults`);
      return { config: defaultConfig, configPath: null, configSource: "defaults" };
    }
  }

  // Try JSON via sync loader (handles explicit JSON and default JSON paths)
  const syncResult = loadConfig(projectRoot, explicitPath);
  if (syncResult.configPath) {
    return syncResult;
  }

  // If an explicit path was given and sync loader didn't find it, stop here
  if (explicitPath) {
    return syncResult;
  }

  // No config found yet — try swoff.config.js
  const jsPath = join(projectRoot, "swoff.config.js");
  if (existsSync(jsPath)) {
    try {
      const fileUrl = `file://${jsPath}`;
      const mod = await import(fileUrl);
      const raw = (mod.default || mod) as Partial<SwoffConfig>;
      const config = mergeConfigs(defaultConfig, raw);
      checkConfigVersion(config);
      return { config, configPath: jsPath, configSource: "JavaScript" };
    } catch {
      log.warn(`Failed to load JS config "${jsPath}" — falling back to defaults`);
    }
  }

  return syncResult;
}
