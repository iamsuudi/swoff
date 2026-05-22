/**
 * Config validator - checks swoff.config.json for correctness.
 * Returns an array of error strings (empty if valid).
 */

import { KNOWN_FEATURES, VALID_STRATEGIES } from "../shared/config-types.js";

export function validateConfig(config: Record<string, unknown>): string[] {
  const errors: string[] = [];

  // Required fields
  const requiredFields = ["enabled", "version", "serviceWorker", "features", "build"];
  const missingFields = requiredFields.filter(
    (field) => config[field] === undefined || config[field] === null,
  );
  if (missingFields.length > 0) {
    errors.push(`Missing required fields: ${missingFields.join(", ")}`);
  }

  // serviceWorker
  if (config.serviceWorker) {
    const sw = config.serviceWorker as Record<string, unknown>;

    if (sw.autoRegister !== undefined && typeof sw.autoRegister !== "boolean") {
      errors.push("serviceWorker.autoRegister must be a boolean");
    }
    if (sw.autoActivate !== undefined && typeof sw.autoActivate !== "boolean") {
      errors.push("serviceWorker.autoActivate must be a boolean");
    }

    if (sw.defaultStrategy && !VALID_STRATEGIES.includes(sw.defaultStrategy as (typeof VALID_STRATEGIES)[number])) {
      errors.push(
        `Invalid defaultStrategy "${sw.defaultStrategy}". Must be one of: ${VALID_STRATEGIES.join(", ")}`,
      );
    }

    if (sw.strategies && typeof sw.strategies === "object") {
      const strategies = sw.strategies as Record<string, string>;
      for (const [pattern, strategy] of Object.entries(strategies)) {
        if (!VALID_STRATEGIES.includes(strategy as (typeof VALID_STRATEGIES)[number])) {
          errors.push(
            `Invalid strategy "${strategy}" for pattern "${pattern}". Must be one of: ${VALID_STRATEGIES.join(", ")}`,
          );
        }
      }
    }
  }

  // features
  if (config.features) {
    const features = config.features as Record<string, unknown>;
    for (const [key, value] of Object.entries(features)) {
      if (!KNOWN_FEATURES.includes(key as (typeof KNOWN_FEATURES)[number])) {
        errors.push(`Unknown feature "${key}"`);
      }
      if (typeof value !== "boolean") {
        errors.push(`Feature "${key}" must be a boolean, got ${typeof value}`);
      }
    }
  }

  // version
  if (config.version && typeof config.version === "string" && config.version !== "from-package") {
    if (!/^\d+\.\d+\.\d+$/.test(config.version as string)) {
      errors.push(`Invalid version "${config.version}". Must be "from-package" or semver (e.g., "1.0.0")`);
    }
  }

  // minSupportedVersion
  if (config.minSupportedVersion && typeof config.minSupportedVersion === "string") {
    if (!/^\d+\.\d+\.\d+$/.test(config.minSupportedVersion as string)) {
      errors.push(
        `Invalid minSupportedVersion "${config.minSupportedVersion}". Must be semver (e.g., "1.0.0")`,
      );
    }
  }

  // build
  if (config.build) {
    const build = config.build as Record<string, unknown>;
    if (build.outputDir && typeof build.outputDir !== "string") {
      errors.push("build.outputDir must be a string");
    }
    if (build.swFilename && typeof build.swFilename !== "string") {
      errors.push("build.swFilename must be a string");
    }
  }

  // pwa
  if (config.pwa) {
    const pwa = config.pwa as Record<string, unknown>;
    if (pwa.preventDefaultInstall !== undefined && typeof pwa.preventDefaultInstall !== "boolean") {
      errors.push("pwa.preventDefaultInstall must be a boolean");
    }
  }

  // database
  if (config.database) {
    const db = config.database as Record<string, unknown>;
    if (db.name && typeof db.name !== "string") {
      errors.push("database.name must be a string");
    }
    if (db.name && typeof db.name === "string" && !/^[a-zA-Z0-9-_]+$/.test(db.name as string)) {
      errors.push(`database.name "${db.name}" must match pattern ^[a-zA-Z0-9-_]+$`);
    }
    if (db.stores && !Array.isArray(db.stores)) {
      errors.push("database.stores must be an array");
    }
    if (db.stores && Array.isArray(db.stores)) {
      for (const store of db.stores as string[]) {
        if (typeof store !== "string") {
          errors.push("database.stores must contain only strings");
          break;
        }
        if (!/^[a-zA-Z0-9-_]+$/.test(store)) {
          errors.push(`database.store "${store}" must match pattern ^[a-zA-Z0-9-_]+$`);
        }
      }
    }
  }

  return errors;
}
