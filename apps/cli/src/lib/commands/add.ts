/**
 * add command - enables one or more feature flags and regenerates.
 * Supports comma-separated features: swoff add auth,graphql,pwa
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, copyFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { log } from "../cli/logger.js";
import { loadConfigAsync } from "../config/loader.js";
import { defaultInitConfig, deepMerge, type SwoffConfig } from "../shared/config-types.js";
import { generateCommand } from "./generate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, "../../../../templates");

const FEATURE_ALIASES: Record<string, string> = {
  mutationqueue: "mutation-queue",
  crosstab: "cross-tab",
  backgroundsync: "background-sync",
  pushnotification: "push-notification",
};

const FEATURE_NAMES = [
  "mutation-queue", "pwa", "cross-tab", "auth",
  "background-sync", "graphql", "push-notification",
  "htmx", "php",
] as const;

const FEATURE_CONFIG_UPDATES: Record<string, Record<string, unknown>> = {
  "mutation-queue": { mutationQueue: { enabled: true, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000 } },
  pwa: { pwa: { enabled: true } },
  "cross-tab": { crossTabSync: true },
  auth: { auth: { enabled: true, type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" } },
  "background-sync": { backgroundSync: true },
  graphql: { graphql: { enabled: true, endpoint: "/graphql" } },
  "push-notification": { pushNotifications: { enabled: true, vapidPublicKey: "" } },
  htmx: {},
  php: {},
};

function normalizeFeature(name: string): string {
  const lower = name.toLowerCase().trim();
  return FEATURE_ALIASES[lower] ?? lower;
}

export async function addCommand(projectRoot: string, featureArg: string) {
  const features = featureArg.split(",").map(normalizeFeature).filter(Boolean);
  const invalid = features.filter((f) => !FEATURE_CONFIG_UPDATES[f]);

  if (invalid.length > 0) {
    log.error(`Unknown feature(s): ${invalid.join(", ")}`);
    log.info(`Available: ${FEATURE_NAMES.join(", ")}`);
    return;
  }

  const label = features.length === 1 ? features[0] : `${features.length} features`;
  log.header(`Adding ${label}`);

  const combinedUpdate = Object.assign({}, ...features.map((f) => FEATURE_CONFIG_UPDATES[f]));

  const loadResult = await loadConfigAsync(projectRoot);
  const configPath = loadResult.configPath;
  let mergedConfig = deepMerge(loadResult.config as Partial<SwoffConfig>, { features: combinedUpdate }) as SwoffConfig;

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

  const ecosystemFeatures = features.filter((f) => f === "htmx" || f === "php");
  for (const eco of ecosystemFeatures) {
    copyEcosystemFiles(projectRoot, eco);
  }

  const coreFeatures = features.filter((f) => f !== "htmx" && f !== "php");
  if (coreFeatures.length > 0) {
    await generateCommand(projectRoot);
  }

  log.success(`${label} added successfully!`);
}

function copyEcosystemFiles(projectRoot: string, name: string): void {
  const src = join(templatesDir, name);
  if (!existsSync(src)) {
    log.warn(`No template files found for "${name}"`);
    return;
  }

  const swoffDir = join(projectRoot, "swoff", name);
  if (!existsSync(swoffDir)) {
    mkdirSync(swoffDir, { recursive: true });
  }

  let count = 0;
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (entry.isFile()) {
      copyFileSync(join(src, entry.name), join(swoffDir, entry.name));
      count++;
    }
  }

  log.success(`Copied ${count} ${name} file(s) to swoff/${name}/`);
}
