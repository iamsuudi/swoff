/**
 * Config loader - reads and merges swoff.config.json/JS with defaults.
 * Eliminates duplicated config-loading logic across CLI commands and generators.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { defaultConfig, mergeConfigs, CONFIG_VERSION, type SwoffConfig } from "../shared/config-types.js";

export interface LoadConfigResult {
  config: SwoffConfig;
  configPath: string | null;
  configSource: string;
}

function checkConfigVersion(config: SwoffConfig): void {
  if (config.configVersion === undefined) {
    console.warn(
      "[swoff] Config is missing configVersion — the format may have changed since it was created.\n" +
      "  Add \"configVersion\": 1 to your swoff.config.json to suppress this warning.",
    );
  } else if (config.configVersion > CONFIG_VERSION) {
    console.warn(
      `[swoff] Config has configVersion ${config.configVersion}, but this CLI version supports up to ${CONFIG_VERSION}.\n` +
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
        console.warn(`[swoff] Warning: Failed to parse explicit config "${explicitPath}" — falling back to defaults`);
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
        console.warn(`[swoff] Warning: Failed to parse "${path}" — falling back to defaults`);
      }
    }

    // JS configs require the async loader
    if (file.endsWith(".js")) {
      throw new Error(
        `JavaScript config files require the async loader. Use loadConfigAsync() instead of loadConfig() for "${path}".`
      );
    }
  }

  return { config: defaultConfig, configPath: null, configSource: "defaults" };
}

/**
 * Async version that also tries to load .js configs via dynamic import.
 */
export async function loadConfigAsync(projectRoot: string, explicitPath?: string): Promise<LoadConfigResult> {
  const syncResult = loadConfig(projectRoot, explicitPath);
  if (syncResult.configPath && syncResult.configPath.endsWith(".js")) {
    try {
      const mod = await import(syncResult.configPath);
      const raw = (mod.default || mod) as Partial<SwoffConfig>;
      const config = mergeConfigs(defaultConfig, raw);
      checkConfigVersion(config);
      return { config, configPath: syncResult.configPath, configSource: "JavaScript" };
    } catch {
      console.warn(`[swoff] Warning: Failed to load JS config "${syncResult.configPath}" — falling back to defaults`);
      return { config: defaultConfig, configPath: null, configSource: "defaults" };
    }
  }

  return syncResult;
}
