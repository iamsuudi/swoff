/**
 * Config loader - reads and merges swoff.config.json/JS with defaults.
 * Eliminates duplicated config-loading logic across CLI commands and generators.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { defaultConfig, mergeConfigs, type SwoffConfig } from "../shared/config-types.js";

export interface LoadConfigResult {
  config: SwoffConfig;
  configPath: string | null;
  configSource: string;
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
        return {
          config: mergeConfigs(defaultConfig, raw),
          configPath: explicitPath,
          configSource: "JSON",
        };
      } catch {
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
        return {
          config: mergeConfigs(defaultConfig, raw),
          configPath: path,
          configSource: "JSON",
        };
      } catch {
        // Continue to try JS config below
      }
    }

    // Return the JS path so loadConfigAsync can dynamically import it
    if (file.endsWith(".js")) {
      return {
        config: defaultConfig,
        configPath: path,
        configSource: "JavaScript",
      };
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
      return {
        config: mergeConfigs(defaultConfig, raw),
        configPath: syncResult.configPath,
        configSource: "JavaScript",
      };
    } catch {
      return { config: defaultConfig, configPath: null, configSource: "defaults" };
    }
  }

  return syncResult;
}
