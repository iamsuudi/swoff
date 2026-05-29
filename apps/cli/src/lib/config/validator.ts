import { KNOWN_FEATURES, OBJECT_FEATURES, VALID_STRATEGIES, REACTIVE_FIELDS } from "../shared/config-types.js";

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
      if (key === "tagInvalidation") {
        if (typeof value !== "boolean" && (typeof value !== "object" || value === null)) {
          errors.push('Feature "tagInvalidation" must be a boolean or an object');
          continue;
        }
      } else if (OBJECT_FEATURES.includes(key as (typeof OBJECT_FEATURES)[number])) {
        if (typeof value !== "object" || value === null) {
          errors.push(`Feature "${key}" must be an object`);
          continue;
        }
      } else if (key === "mutationQueue") {
        if (typeof value !== "boolean" && (typeof value !== "object" || value === null)) {
          errors.push('Feature "mutationQueue" must be a boolean or an object');
          continue;
        }
        if (typeof value === "object") {
          const mq = value as Record<string, unknown>;
          if (mq.enabled !== undefined && typeof mq.enabled !== "boolean") {
            errors.push("features.mutationQueue.enabled must be a boolean");
          }
          if (mq.batchSize !== undefined && (typeof mq.batchSize !== "number" || mq.batchSize < 1 || !Number.isInteger(mq.batchSize))) {
            errors.push("features.mutationQueue.batchSize must be a positive integer");
          }
          if (mq.batchDelayMs !== undefined && (typeof mq.batchDelayMs !== "number" || mq.batchDelayMs < 0 || !Number.isInteger(mq.batchDelayMs))) {
            errors.push("features.mutationQueue.batchDelayMs must be a non-negative integer");
          }
          if (mq.maxRetries !== undefined && (typeof mq.maxRetries !== "number" || mq.maxRetries < 1 || !Number.isInteger(mq.maxRetries))) {
            errors.push("features.mutationQueue.maxRetries must be a positive integer");
          }
          if (mq.retryBackoffMs !== undefined && (typeof mq.retryBackoffMs !== "number" || mq.retryBackoffMs < 0)) {
            errors.push("features.mutationQueue.retryBackoffMs must be a non-negative number");
          }
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
      const REACTIVE_FIELDS_SET = new Set(REACTIVE_FIELDS);
      if (sw.strategies && typeof sw.strategies === "object") {
        const strategies = sw.strategies as Record<string, unknown>;
        for (const [pattern, entry] of Object.entries(strategies)) {
          if (typeof entry === "string") {
            if (!VALID_STRATEGIES.includes(entry as (typeof VALID_STRATEGIES)[number])) {
              errors.push(
                `Invalid strategy "${entry}" for pattern "${pattern}". Must be one of: ${VALID_STRATEGIES.join(", ")}`,
              );
            }
          } else if (typeof entry === "object" && entry !== null) {
            const obj = entry as Record<string, unknown>;
            const strat = (obj.strategy as string) || "";
            if (strat && !VALID_STRATEGIES.includes(strat as (typeof VALID_STRATEGIES)[number])) {
              errors.push(
                `Invalid strategy "${strat}" for pattern "${pattern}". Must be one of: ${VALID_STRATEGIES.join(", ")}`,
              );
            }
            // Reactive-only fields are only valid with "reactive" strategy
            if (strat !== "reactive") {
              for (const field of REACTIVE_FIELDS) {
                if (obj[field] !== undefined) {
                  errors.push(`features.serviceWorker.strategies["${pattern}"].${field} is only valid with "reactive" strategy`);
                }
              }
            } else {
              if (obj.staleTime !== undefined && (typeof obj.staleTime !== "number" || obj.staleTime < 0)) {
                errors.push(`features.serviceWorker.strategies["${pattern}"].staleTime must be a non-negative number`);
              }
              if (obj.refetchInterval !== undefined && (typeof obj.refetchInterval !== "number" || obj.refetchInterval < 0)) {
                errors.push(`features.serviceWorker.strategies["${pattern}"].refetchInterval must be a non-negative number`);
              }
              if (obj.refetchOnReconnect !== undefined && typeof obj.refetchOnReconnect !== "boolean") {
                errors.push(`features.serviceWorker.strategies["${pattern}"].refetchOnReconnect must be a boolean`);
              }
              if (obj.refetchOnFocus !== undefined && typeof obj.refetchOnFocus !== "boolean") {
                errors.push(`features.serviceWorker.strategies["${pattern}"].refetchOnFocus must be a boolean`);
              }
            }
          } else {
            errors.push(`features.serviceWorker.strategies["${pattern}"] must be a string or an object`);
          }
        }
      }
      if (sw.refetchBatchSize !== undefined && (typeof sw.refetchBatchSize !== "number" || sw.refetchBatchSize < 1 || !Number.isInteger(sw.refetchBatchSize))) {
        errors.push("features.serviceWorker.refetchBatchSize must be a positive integer");
      }
      if (sw.refetchBatchDelayMs !== undefined && (typeof sw.refetchBatchDelayMs !== "number" || sw.refetchBatchDelayMs < 0 || !Number.isInteger(sw.refetchBatchDelayMs))) {
        errors.push("features.serviceWorker.refetchBatchDelayMs must be a non-negative integer");
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
      if (sw.cacheStrategy !== undefined && !["all", "explicit-only"].includes(sw.cacheStrategy as string)) {
        errors.push('features.serviceWorker.cacheStrategy must be "all" or "explicit-only"');
      }
      if (sw.navigationPreload !== undefined && typeof sw.navigationPreload !== "boolean") {
        errors.push("features.serviceWorker.navigationPreload must be a boolean");
      }
      if (sw.normalizeCacheKey !== undefined && typeof sw.normalizeCacheKey !== "boolean") {
        errors.push("features.serviceWorker.normalizeCacheKey must be a boolean");
      }
      if (sw.ignoreQueryParams !== undefined && (!Array.isArray(sw.ignoreQueryParams) || !sw.ignoreQueryParams.every((p: unknown) => typeof p === "string"))) {
        errors.push("features.serviceWorker.ignoreQueryParams must be an array of strings");
      }
      if (sw.staleTime !== undefined && (typeof sw.staleTime !== "number" || sw.staleTime < 0)) {
        errors.push("features.serviceWorker.staleTime must be a non-negative number");
      }
      if (sw.refetchInterval !== undefined && (typeof sw.refetchInterval !== "number" || sw.refetchInterval < 0 || !Number.isInteger(sw.refetchInterval))) {
        errors.push("features.serviceWorker.refetchInterval must be a non-negative integer");
      }
      if (sw.refetchOnReconnect !== undefined && typeof sw.refetchOnReconnect !== "boolean") {
        errors.push("features.serviceWorker.refetchOnReconnect must be a boolean");
      }
      if (sw.refetchOnFocus !== undefined && typeof sw.refetchOnFocus !== "boolean") {
        errors.push("features.serviceWorker.refetchOnFocus must be a boolean");
      }
      if (sw.refetchMaxRetries !== undefined && (typeof sw.refetchMaxRetries !== "number" || sw.refetchMaxRetries < 0 || !Number.isInteger(sw.refetchMaxRetries))) {
        errors.push("features.serviceWorker.refetchMaxRetries must be a non-negative integer");
      }
      if (sw.refetchRetryDelayMs !== undefined && (typeof sw.refetchRetryDelayMs !== "number" || sw.refetchRetryDelayMs < 0 || !Number.isInteger(sw.refetchRetryDelayMs))) {
        errors.push("features.serviceWorker.refetchRetryDelayMs must be a non-negative integer");
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
    if (tagInvalidationVal && typeof tagInvalidationVal === "object") {
      const ti = tagInvalidationVal as Record<string, unknown>;
      if (ti.prefixes !== undefined && (!Array.isArray(ti.prefixes) || !(ti.prefixes as unknown[]).every((p) => typeof p === "string"))) {
        errors.push("features.tagInvalidation.prefixes must be an array of strings");
      }
      if (ti.patterns !== undefined && (typeof ti.patterns !== "object" || ti.patterns === null)) {
        errors.push("features.tagInvalidation.patterns must be an object");
      }
      if (ti.singularization !== undefined && (typeof ti.singularization !== "object" || ti.singularization === null)) {
        errors.push("features.tagInvalidation.singularization must be an object");
      }
      if (ti.cascading !== undefined && (typeof ti.cascading !== "object" || ti.cascading === null)) {
        errors.push("features.tagInvalidation.cascading must be an object");
      }
      if (ti.invalidation !== undefined && typeof ti.invalidation === "object" && ti.invalidation !== null) {
        const inv = ti.invalidation as Record<string, unknown>;
        if (inv.debounceMs !== undefined && (typeof inv.debounceMs !== "number" || inv.debounceMs < 0 || !Number.isInteger(inv.debounceMs))) {
          errors.push("features.tagInvalidation.invalidation.debounceMs must be a non-negative integer");
        }
        if (inv.optimistic !== undefined && typeof inv.optimistic !== "boolean") {
          errors.push("features.tagInvalidation.invalidation.optimistic must be a boolean");
        }
      }
    }
    const tagInvalidationEnabled = typeof tagInvalidationVal === "boolean" ? tagInvalidationVal : (tagInvalidationVal as Record<string, unknown>)?.enabled === true;
    const crossTabSyncVal = features.crossTabSync;
    if (crossTabSyncVal === true && !tagInvalidationEnabled) {
      errors.push("crossTabSync requires tagInvalidation to be enabled");
    }

    const backgroundSyncVal = features.backgroundSync;
    const mutationQueueVal = features.mutationQueue;
    const mqEnabled = typeof mutationQueueVal === "boolean" ? mutationQueueVal : (mutationQueueVal as Record<string, unknown>)?.enabled === true;
    if (backgroundSyncVal === true && !mqEnabled) {
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

    const graphql = features.graphql as Record<string, unknown> | undefined;
    if (graphql && typeof graphql === "object") {
      if (graphql.enabled !== undefined && typeof graphql.enabled !== "boolean") {
        errors.push("features.graphql.enabled must be a boolean");
      }
      if (graphql.endpoint !== undefined && typeof graphql.endpoint !== "string") {
        errors.push("features.graphql.endpoint must be a string");
      }
    }

    const serverPush = features.serverPush as Record<string, unknown> | undefined;
    if (serverPush && typeof serverPush === "object") {
      if (serverPush.enabled !== undefined && typeof serverPush.enabled !== "boolean") {
        errors.push("features.serverPush.enabled must be a boolean");
      }
      if (serverPush.type !== undefined && !["sse", "websocket"].includes(serverPush.type as string)) {
        errors.push('features.serverPush.type must be "sse" or "websocket"');
      }
      if (serverPush.endpoint !== undefined && typeof serverPush.endpoint !== "string") {
        errors.push("features.serverPush.endpoint must be a string");
      }
      if (serverPush.reconnectDelayMs !== undefined && (typeof serverPush.reconnectDelayMs !== "number" || serverPush.reconnectDelayMs < 0)) {
        errors.push("features.serverPush.reconnectDelayMs must be a non-negative number");
      }
    }

    const pushNotifications = features.pushNotifications as Record<string, unknown> | undefined;
    if (pushNotifications && typeof pushNotifications === "object") {
      if (pushNotifications.enabled !== undefined && typeof pushNotifications.enabled !== "boolean") {
        errors.push("features.pushNotifications.enabled must be a boolean");
      }
      if (pushNotifications.vapidPublicKey !== undefined && typeof pushNotifications.vapidPublicKey !== "string") {
        errors.push("features.pushNotifications.vapidPublicKey must be a string");
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
