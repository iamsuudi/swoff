import { KNOWN_FEATURES, OBJECT_FEATURES, VALID_STRATEGIES } from "../shared/config-types.js";

export function validateConfig(config: Record<string, unknown>): string[] {
  const errors: string[] = [];

  const requiredFields = ["enabled", "version", "serviceWorker", "features", "build"];
  const missingFields = requiredFields.filter(
    (field) => config[field] === undefined || config[field] === null,
  );
  if (missingFields.length > 0) {
    errors.push(`Missing required fields: ${missingFields.join(", ")}`);
  }

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

    if (sw.clearRuntimeOnUpdate !== undefined && typeof sw.clearRuntimeOnUpdate !== "boolean") {
      errors.push("serviceWorker.clearRuntimeOnUpdate must be a boolean");
    }

    if (sw.navigationMode !== undefined && !["spa", "default"].includes(sw.navigationMode as string)) {
      errors.push('serviceWorker.navigationMode must be "spa" or "default"');
    }

    if (sw.spaEntry !== undefined && typeof sw.spaEntry !== "string") {
      errors.push("serviceWorker.spaEntry must be a string");
    }
  }

  if (config.features) {
    const features = config.features as Record<string, unknown>;

    for (const [key, value] of Object.entries(features)) {
      if (OBJECT_FEATURES.includes(key as (typeof OBJECT_FEATURES)[number])) {
        if (typeof value !== "object" || value === null) {
          errors.push(`Feature "${key}" must be an object`);
          continue;
        }
      } else if (!KNOWN_FEATURES.includes(key as (typeof KNOWN_FEATURES)[number])) {
        errors.push(`Unknown feature "${key}"`);
        continue;
      } else if (typeof value !== "boolean") {
        errors.push(`Feature "${key}" must be a boolean, got ${typeof value}`);
      }
    }

    const pwa = features.pwa as Record<string, unknown> | undefined;
    if (pwa && typeof pwa === "object") {
      if (pwa.enabled !== undefined && typeof pwa.enabled !== "boolean") {
        errors.push("features.pwa.enabled must be a boolean");
      }
      if (pwa.preventDefaultInstall !== undefined && typeof pwa.preventDefaultInstall !== "boolean") {
        errors.push("features.pwa.preventDefaultInstall must be a boolean");
      }
    }

    const tagInvalidationVal = features.tagInvalidation;
    const crossTabSyncVal = features.crossTabSync;
    if (crossTabSyncVal === true && tagInvalidationVal !== true) {
      errors.push("crossTabSync requires tagInvalidation to be enabled");
    }

    const indexeddb = features.indexeddb as Record<string, unknown> | undefined;
    if (indexeddb && typeof indexeddb === "object") {
      if (indexeddb.enabled !== undefined && typeof indexeddb.enabled !== "boolean") {
        errors.push("features.indexeddb.enabled must be a boolean");
      }
      if (indexeddb.name !== undefined && typeof indexeddb.name !== "string") {
        errors.push("features.indexeddb.name must be a string");
      }
      if (indexeddb.name && typeof indexeddb.name === "string" && !/^[a-zA-Z0-9-_]+$/.test(indexeddb.name as string)) {
        errors.push(`features.indexeddb.name "${indexeddb.name}" must match pattern ^[a-zA-Z0-9-_]+$`);
      }
      if (indexeddb.stores !== undefined && !Array.isArray(indexeddb.stores)) {
        errors.push("features.indexeddb.stores must be an array");
      }
      if (indexeddb.stores && Array.isArray(indexeddb.stores)) {
        for (const store of indexeddb.stores as string[]) {
          if (typeof store !== "string") {
            errors.push("features.indexeddb.stores must contain only strings");
            break;
          }
          if (!/^[a-zA-Z0-9-_]+$/.test(store)) {
            errors.push(`features.indexeddb.store "${store}" must match pattern ^[a-zA-Z0-9-_]+$`);
          }
        }
      }
    }

    const auth = features.auth as Record<string, unknown> | undefined;
    if (auth && typeof auth === "object") {
      if (auth.enabled !== undefined && typeof auth.enabled !== "boolean") {
        errors.push("features.auth.enabled must be a boolean");
      }
      if (auth.type !== undefined && !["cookie", "bearer", "custom"].includes(auth.type as string)) {
        errors.push('features.auth.type must be "cookie", "bearer", or "custom"');
      }
      if (auth.refreshPath !== undefined && typeof auth.refreshPath !== "string") {
        errors.push("features.auth.refreshPath must be a string");
      }
      if (auth.userEndpoint !== undefined && typeof auth.userEndpoint !== "string") {
        errors.push("features.auth.userEndpoint must be a string");
      }
    }
  }

  if (config.version && typeof config.version === "string" && config.version !== "from-package") {
    if (!/^\d+\.\d+\.\d+$/.test(config.version as string)) {
      errors.push(`Invalid version "${config.version}". Must be "from-package" or semver (e.g., "1.0.0")`);
    }
  }

  if (config.minSupportedVersion && typeof config.minSupportedVersion === "string") {
    if (!/^\d+\.\d+\.\d+$/.test(config.minSupportedVersion as string)) {
      errors.push(
        `Invalid minSupportedVersion "${config.minSupportedVersion}". Must be semver (e.g., "1.0.0")`,
      );
    }
  }

  if (config.build) {
    const build = config.build as Record<string, unknown>;
    if (build.outputDir && typeof build.outputDir !== "string") {
      errors.push("build.outputDir must be a string");
    }
    if (build.swFilename && typeof build.swFilename !== "string") {
      errors.push("build.swFilename must be a string");
    }
  }

  return errors;
}
