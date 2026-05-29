/**
 * add command - enables one or more feature flags and regenerates.
 * Supports comma-separated features: swoff add auth,graphql,pwa
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { log } from "../cli/logger.js";
import { loadConfigAsync } from "../config/loader.js";
import { defaultConfig, type SwoffConfig } from "../shared/config-types.js";
import { generateCommand } from "./generate.js";

const FEATURE_ALIASES: Record<string, string> = {
  mutationqueue: "mutation-queue",
  crosstab: "cross-tab",
  taginvalidation: "tag-invalidation",
  backgroundsync: "background-sync",
  pushnotification: "push-notification",
};

const FEATURE_NAMES = [
  "mutation-queue", "pwa", "cross-tab", "auth",
  "tag-invalidation", "background-sync", "graphql", "push-notification",
] as const;

const FEATURE_CONFIG_UPDATES: Record<string, Record<string, unknown>> = {
  "mutation-queue": { mutationQueue: { enabled: true, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000 } },
  pwa: { pwa: { enabled: true } },
  "cross-tab": { crossTabSync: true, tagInvalidation: true },
  auth: { auth: { enabled: true, type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" } },
  "tag-invalidation": { tagInvalidation: true },
  "background-sync": { backgroundSync: true },
  graphql: { graphql: { enabled: true, endpoint: "/graphql" } },
  "push-notification": { pushNotifications: { enabled: true, vapidPublicKey: "" } },
};

function normalizeFeature(name: string): string {
  const lower = name.toLowerCase().trim();
  return FEATURE_ALIASES[lower] ?? lower;
}

function mergeFeatureIntoRaw(raw: Record<string, unknown>, update: Record<string, unknown>): Record<string, unknown> {
  const features = { ...((raw.features as Record<string, unknown>) || {}) };
  for (const [key, value] of Object.entries(update)) {
    if (typeof value === "object" && value !== null && typeof features[key] === "object" && features[key] !== null) {
      features[key] = { ...(features[key] as Record<string, unknown>), ...(value as Record<string, unknown>) };
    } else {
      features[key] = value;
    }
  }
  return { ...raw, features };
}

export async function addCommand(projectRoot: string, featureArg: string) {
  const features = featureArg.split(",").map(normalizeFeature).filter(Boolean);
  const invalid = features.filter((f) => !FEATURE_CONFIG_UPDATES[f]);

  if (invalid.length > 0) {
    log.error(`Unknown feature(s): ${invalid.join(", ")}`);
    log.info(`Available features: ${FEATURE_NAMES.join(", ")}`);
    return;
  }

  const label = features.length === 1 ? features[0] : `${features.length} features`;
  log.header(`Adding ${label}`);

  const configUpdates = features.map((f) => FEATURE_CONFIG_UPDATES[f]);
  const combinedUpdate = Object.assign({}, ...configUpdates);

  const { configPath } = await loadConfigAsync(projectRoot);
  const resolvedConfigPath = configPath || join(projectRoot, "swoff.config.json");

  if (!configPath) {
    log.warn("No config found. Creating new config with features...");
    const newConfig: SwoffConfig = {
      ...defaultConfig,
      $schema: "https://swoff.netlify.app/schema/v1.json",
      features: {
        ...defaultConfig.features,
        serviceWorker: {
          ...defaultConfig.features.serviceWorker,
          minSupportedVersion: "0.0.0",
        },
        crossTabSync: false,
      },
    };
    const raw = JSON.parse(JSON.stringify(newConfig));
    const merged = mergeFeatureIntoRaw(raw, combinedUpdate);
    writeFileSync(resolvedConfigPath, JSON.stringify(merged, null, 2));
    log.success(`Created swoff.config.json with ${label}`);
  } else {
    const raw = JSON.parse(readFileSync(resolvedConfigPath, "utf8"));
    const merged = mergeFeatureIntoRaw(raw, combinedUpdate);
    writeFileSync(resolvedConfigPath, JSON.stringify(merged, null, 2));
    log.success(`Updated swoff.config.json with ${label}`);
  }

  await generateCommand(projectRoot);
  log.success(`${label} added successfully!`);
}
