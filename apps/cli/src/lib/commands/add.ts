/**
 * add command - enables a feature flag and regenerates.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { log } from "../cli/logger.js";
import { loadConfigAsync } from "../config/loader.js";
import { defaultConfig, mergeConfigs, type SwoffConfig } from "../shared/config-types.js";
import { generateCommand } from "./generate.js";

const KNOWN_FEATURES = ["mutation-queue", "mutationqueue", "pwa", "cross-tab", "crosstab", "auth", "tag-invalidation", "taginvalidation", "background-sync", "backgroundsync", "client-registration", "clientregistration"];

const featureMap: Record<string, Record<string, unknown>> = {
  "mutation-queue": { mutationQueue: true },
  mutationqueue: { mutationQueue: true },
  pwa: { pwa: { enabled: true } },
  "cross-tab": { crossTabSync: true, tagInvalidation: true },
  crosstab: { crossTabSync: true, tagInvalidation: true },
  auth: { auth: { enabled: true, type: "bearer", refreshPath: "/api/refresh", userEndpoint: "/api/me" } },
  "tag-invalidation": { tagInvalidation: true },
  taginvalidation: { tagInvalidation: true },
  "background-sync": { backgroundSync: true },
  backgroundsync: { backgroundSync: true },
  "client-registration": { clientRegistration: true },
  clientregistration: { clientRegistration: true },
};

export async function addCommand(projectRoot: string, feature: string) {
  log.header(`Adding ${feature} feature`);

  const configUpdate = featureMap[feature.toLowerCase()];

  if (!configUpdate) {
    log.error(`Unknown feature: ${feature}`);
    log.info("Available features: mutation-queue, pwa, cross-tab, auth, tag-invalidation, background-sync, client-registration");
    return;
  }

  const { configPath } = await loadConfigAsync(projectRoot);
  const resolvedConfigPath = configPath || join(projectRoot, "swoff.config.json");

  if (!configPath) {
    log.warn("No config found. Creating new config with feature...");
    const newConfig: SwoffConfig = {
      ...defaultConfig,
      $schema: "https://swoff.netlify.app/schema/v1.json",
      minSupportedVersion: "0.0.0",
      features: {
        ...defaultConfig.features,
        crossTabSync: false,
      },
    };
    writeFileSync(resolvedConfigPath, JSON.stringify(newConfig, null, 2));
    log.success(`Created swoff.config.json with ${feature} feature`);
  } else {
    const raw = JSON.parse(readFileSync(resolvedConfigPath, "utf8"));
    const objectFeatures = ["pwa", "serviceWorker", "auth"];
    const merged = { ...raw.features, ...configUpdate };
    for (const key of objectFeatures) {
      if (configUpdate[key] && raw.features?.[key]) {
        merged[key] = { ...raw.features[key], ...(configUpdate[key] as Record<string, unknown>) };
      }
    }
    raw.features = merged;
    writeFileSync(resolvedConfigPath, JSON.stringify(raw, null, 2));
    log.success(`Updated swoff.config.json with ${feature} feature`);
  }

  await generateCommand(projectRoot);
  log.success(`${feature} feature added successfully!`);
}
