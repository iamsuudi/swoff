import { KNOWN_FEATURES, OBJECT_FEATURES, VALID_STRATEGIES } from "../shared/config-types.js";

export function validateConfig(config: Record<string, unknown>): string[] {
  const errors: string[] = [];

  const requiredFields = ["enabled", "features", "build"];
  const missingFields = requiredFields.filter(
    (field) => config[field] === undefined || config[field] === null,
  );
  if (missingFields.length > 0) {
    errors.push(`Missing required fields: ${missingFields.join(", ")}`);
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

    const sw = features.serviceWorker as Record<string, unknown> | undefined;
    if (sw) {
      if (sw.autoUpdate !== undefined && typeof sw.autoUpdate !== "boolean") {
        errors.push("features.serviceWorker.autoUpdate must be a boolean");
      }
      if (sw.autoActivate !== undefined && typeof sw.autoActivate !== "boolean") {
        errors.push("features.serviceWorker.autoActivate must be a boolean");
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
        errors.push("features.serviceWorker.clearRuntimeOnUpdate must be a boolean");
      }
      if (sw.navigationMode !== undefined && !["spa", "default"].includes(sw.navigationMode as string)) {
        errors.push('features.serviceWorker.navigationMode must be "spa" or "default"');
      }
      if (sw.spaEntry !== undefined && typeof sw.spaEntry !== "string") {
        errors.push("features.serviceWorker.spaEntry must be a string");
      }

      const ver = sw.version as Record<string, unknown> | undefined;
      if (ver) {
        if (ver.enabled !== undefined && typeof ver.enabled !== "boolean") {
          errors.push("features.serviceWorker.version.enabled must be a boolean");
        }
        if (ver.source !== undefined && !["from-package", "manual"].includes(ver.source as string)) {
          errors.push('features.serviceWorker.version.source must be "from-package" or "manual"');
        }
        if (ver.source === "manual" && !ver.value) {
          errors.push("features.serviceWorker.version.value is required when source is 'manual'");
        }
        if (ver.value !== undefined && typeof ver.value === "string" && ver.value !== "from-package") {
          if (!/^\d+\.\d+\.\d+$/.test(ver.value)) {
            errors.push(`Invalid version value "${ver.value}". Must be semver (e.g., "1.0.0")`);
          }
        }
        if (ver.minSupportedVersion !== undefined && typeof ver.minSupportedVersion === "string") {
          if (!/^\d+\.\d+\.\d+$/.test(ver.minSupportedVersion as string)) {
            errors.push(
              `Invalid minSupportedVersion "${ver.minSupportedVersion}". Must be semver (e.g., "1.0.0")`,
            );
          }
        }
      }
    }

    const tagInvalidationVal = features.tagInvalidation;
    const crossTabSyncVal = features.crossTabSync;
    if (crossTabSyncVal === true && tagInvalidationVal !== true) {
      errors.push("crossTabSync requires tagInvalidation to be enabled");
    }

    const backgroundSyncVal = features.backgroundSync;
    const mutationQueueVal = features.mutationQueue;
    if (backgroundSyncVal === true && mutationQueueVal !== true) {
      errors.push("backgroundSync requires mutationQueue to be enabled");
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

  const fw = config.framework;
  if (fw !== undefined && typeof fw === "string" && !["react", "vue", "svelte", "vanilla"].includes(fw)) {
    errors.push('framework must be "react", "vue", "svelte", or "vanilla"');
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
