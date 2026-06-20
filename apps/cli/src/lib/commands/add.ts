/**
 * add command - enables one or more feature flags and regenerates.
 * Supports comma-separated features: swoff add auth,graphql,pwa
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { log } from "../cli/logger.js";
import { loadConfigAsync } from "../config/loader.js";
import { validateConfig } from "../config/validator.js";
import { deepMerge, type SwoffConfig } from "../shared/config-types.js";
import { FEATURES, getFeature, resolveDependencies, getAuthConflicts, buildConfigUpdate } from "../shared/feature-registry.js";
import { generateCommand } from "./generate.js";

const FEATURE_ALIASES: Record<string, string> = {
  mutationqueue: "mutation-queue",
  backgroundsync: "background-sync",
  pushnotification: "push-notification",
};

const FEATURE_NAMES = Object.keys(FEATURES);

function normalizeFeature(name: string): string {
  const lower = name.toLowerCase().trim();
  return FEATURE_ALIASES[lower] ?? lower;
}

export async function addCommand(projectRoot: string, featureArg: string) {
  const rawFeatures = featureArg.split(",").map(normalizeFeature).filter(Boolean);
  const coreFeatures = rawFeatures;

  const invalid = coreFeatures.filter((f) => !FEATURES[f]);
  if (invalid.length > 0) {
    log.error(`Unknown feature(s): ${invalid.join(", ")}`);
    log.info(`Available: ${FEATURE_NAMES.join(", ")}`);
    return;
  }

  const label = rawFeatures.length === 1 ? rawFeatures[0] : `${rawFeatures.length} features`;
  log.header(`Adding ${label}`);

  const loadResult = await loadConfigAsync(projectRoot);
  const configPath = loadResult.configPath;
  const existingConfig = loadResult.config;

  const deps = resolveDependencies(coreFeatures);

  const authConflicts = getAuthConflicts(deps, existingConfig);
  if (authConflicts.length > 0) {
    log.error(`Cannot add ${authConflicts.join(", ")} with auth type "${existingConfig.features.auth.type}" — these features require cookie auth`);
    log.info("Change auth type to \"cookie\" in swoff.config.json and try again, or run: swoff add auth");
    return;
  }

  const combinedUpdate = buildConfigUpdate(coreFeatures);

  let mergedConfig = deepMerge(existingConfig as Partial<SwoffConfig>, { features: combinedUpdate }) as SwoffConfig;

  const isJsConfig = configPath ? configPath.endsWith(".js") : false;
  const resolvedConfigPath = (!configPath || isJsConfig)
    ? join(projectRoot, "swoff.config.json")
    : configPath;

  if (!configPath) {
    log.warn("No config found. Creating new config with features...");
  } else if (isJsConfig) {
    log.warn("JS config detected. Converting to swoff.config.json for simplicity.");
  }

  writeFileSync(resolvedConfigPath, JSON.stringify(mergedConfig, null, 2));
  log.success(`${!configPath ? "Created" : "Updated"} swoff.config.json with ${label}`);

  if (coreFeatures.length > 0) {
    await generateCommand(projectRoot);
  }

  log.success(`${label} added successfully!`);
}
