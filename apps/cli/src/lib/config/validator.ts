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
      if (OBJECT_FEATURES.includes(key as (typeof OBJECT_FEATURES)[number])) {
        if (typeof value !== "object" || value === null) {
          errors.push(`Feature "${key}" must be an object`);
          continue;
        }
      } else if (key !== "backgroundSync" && key !== "crossTabSync") {
        if (!KNOWN_FEATURES.includes(key as (typeof KNOWN_FEATURES)[number])) {
          errors.push(`Unknown feature "${key}"`);
          continue;
        }
        if (typeof value !== "boolean") {
          errors.push(`Feature "${key}" must be a boolean, got ${typeof value}`);
        }
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
      const ver = sw.version;
      if (ver !== false && typeof ver !== "string") {
        errors.push('features.serviceWorker.version must be a string or false');
      }
      if (typeof ver === "string") {
        const isSemver = /^\d+\.\d+\.\d+$/.test(ver);
        const isPackage = ver === "package";
        const isHash = ver === "hash";
        if (!isSemver && !isPackage && !isHash) {
          errors.push(`features.serviceWorker.version must be "package", "hash", a semver string (e.g. "1.0.0"), or false`);
        }
      }
      if (sw.minSupportedVersion !== undefined && typeof sw.minSupportedVersion === "string") {
        if (!/^\d+\.\d+\.\d+$/.test(sw.minSupportedVersion as string)) {
          errors.push(
            `Invalid minSupportedVersion "${sw.minSupportedVersion}". Must be semver (e.g., "1.0.0")`,
          );
        }
      }

      if (sw.autoUpdate !== undefined && typeof sw.autoUpdate !== "boolean") {
        errors.push("features.serviceWorker.autoUpdate must be a boolean");
      }
      if (sw.autoActivate !== undefined && typeof sw.autoActivate !== "boolean") {
        errors.push("features.serviceWorker.autoActivate must be a boolean");
      }
      const strategy = sw.strategy as Record<string, unknown> | undefined;
      if (strategy && typeof strategy === "object") {
        if (strategy.default && !VALID_STRATEGIES.includes(strategy.default as (typeof VALID_STRATEGIES)[number])) {
          errors.push(
            `Invalid features.serviceWorker.strategy.default "${strategy.default}". Must be one of: ${VALID_STRATEGIES.join(", ")}`,
          );
        }
        const patterns = strategy.patterns as Record<string, unknown> | undefined;
        if (patterns && typeof patterns === "object") {
          for (const [pattern, entry] of Object.entries(patterns)) {
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
              if (strat !== "reactive") {
                for (const field of REACTIVE_FIELDS) {
                  if (obj[field] !== undefined) {
                    errors.push(`features.serviceWorker.strategy.patterns["${pattern}"].${field} is only valid with "reactive" strategy`);
                  }
                }
              } else {
                if (obj.staleTime !== undefined && (typeof obj.staleTime !== "number" || obj.staleTime < 0)) {
                  errors.push(`features.serviceWorker.strategy.patterns["${pattern}"].staleTime must be a non-negative number`);
                }
                if (obj.refetchInterval !== undefined && (typeof obj.refetchInterval !== "number" || obj.refetchInterval < 0)) {
                  errors.push(`features.serviceWorker.strategy.patterns["${pattern}"].refetchInterval must be a non-negative number`);
                }
                if (obj.refetchOnReconnect !== undefined && typeof obj.refetchOnReconnect !== "boolean") {
                  errors.push(`features.serviceWorker.strategy.patterns["${pattern}"].refetchOnReconnect must be a boolean`);
                }
                if (obj.refetchOnFocus !== undefined && typeof obj.refetchOnFocus !== "boolean") {
                  errors.push(`features.serviceWorker.strategy.patterns["${pattern}"].refetchOnFocus must be a boolean`);
                }
              }
            } else {
              errors.push(`features.serviceWorker.strategy.patterns["${pattern}"] must be a string or an object`);
            }
          }
        }
        if (strategy.clearRuntimeOnUpdate !== undefined && typeof strategy.clearRuntimeOnUpdate !== "boolean") {
          errors.push("features.serviceWorker.strategy.clearRuntimeOnUpdate must be a boolean");
        }
        if (strategy.mode !== undefined && !["all", "explicit-only"].includes(strategy.mode as string)) {
          errors.push('features.serviceWorker.strategy.mode must be "all" or "explicit-only"');
        }
        if (strategy.normalizeKey !== undefined && typeof strategy.normalizeKey !== "boolean") {
          errors.push("features.serviceWorker.strategy.normalizeKey must be a boolean");
        }
        if (strategy.ignoreQueryParams !== undefined && (!Array.isArray(strategy.ignoreQueryParams) || !(strategy.ignoreQueryParams as unknown[]).every((p: unknown) => typeof p === "string"))) {
          errors.push("features.serviceWorker.strategy.ignoreQueryParams must be an array of strings");
        }
        const reactive = strategy.reactive as Record<string, unknown> | undefined;
        if (reactive && typeof reactive === "object") {
          const defaults = reactive.defaults as Record<string, unknown> | undefined;
          if (defaults && typeof defaults === "object") {
            if (defaults.staleTime !== undefined && (typeof defaults.staleTime !== "number" || defaults.staleTime < 0)) {
              errors.push("features.serviceWorker.strategy.reactive.defaults.staleTime must be a non-negative number");
            }
            if (defaults.refetchInterval !== undefined && (typeof defaults.refetchInterval !== "number" || defaults.refetchInterval < 0 || !Number.isInteger(defaults.refetchInterval))) {
              errors.push("features.serviceWorker.strategy.reactive.defaults.refetchInterval must be a non-negative integer");
            }
            if (defaults.refetchOnReconnect !== undefined && typeof defaults.refetchOnReconnect !== "boolean") {
              errors.push("features.serviceWorker.strategy.reactive.defaults.refetchOnReconnect must be a boolean");
            }
            if (defaults.refetchOnFocus !== undefined && typeof defaults.refetchOnFocus !== "boolean") {
              errors.push("features.serviceWorker.strategy.reactive.defaults.refetchOnFocus must be a boolean");
            }
          }
        }
      }
      const navigation = sw.navigation as Record<string, unknown> | undefined;
      if (navigation && typeof navigation === "object") {
        if (navigation.mode !== undefined && !["spa", "default"].includes(navigation.mode as string)) {
          errors.push('features.serviceWorker.navigation.mode must be "spa" or "default"');
        }
        if (navigation.fallback !== undefined && typeof navigation.fallback !== "string") {
          errors.push("features.serviceWorker.navigation.fallback must be a string");
        }
        if (navigation.preload !== undefined && typeof navigation.preload !== "boolean") {
          errors.push("features.serviceWorker.navigation.preload must be a boolean");
        }
      }
    }

    const refetchQueue = features.refetchQueue as Record<string, unknown> | undefined;
    if (refetchQueue && typeof refetchQueue === "object") {
      if (refetchQueue.batchSize !== undefined && (typeof refetchQueue.batchSize !== "number" || refetchQueue.batchSize < 1 || !Number.isInteger(refetchQueue.batchSize))) {
        errors.push("features.refetchQueue.batchSize must be a positive integer");
      }
      if (refetchQueue.batchDelayMs !== undefined && (typeof refetchQueue.batchDelayMs !== "number" || refetchQueue.batchDelayMs < 0 || !Number.isInteger(refetchQueue.batchDelayMs))) {
        errors.push("features.refetchQueue.batchDelayMs must be a non-negative integer");
      }
      if (refetchQueue.maxRetries !== undefined && (typeof refetchQueue.maxRetries !== "number" || refetchQueue.maxRetries < 0 || !Number.isInteger(refetchQueue.maxRetries))) {
        errors.push("features.refetchQueue.maxRetries must be a non-negative integer");
      }
      if (refetchQueue.retryDelayMs !== undefined && (typeof refetchQueue.retryDelayMs !== "number" || refetchQueue.retryDelayMs < 0 || !Number.isInteger(refetchQueue.retryDelayMs))) {
        errors.push("features.refetchQueue.retryDelayMs must be a non-negative integer");
      }
    }

    const tagInvalidationVal = features.tagInvalidation as Record<string, unknown> | undefined;
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
    }
    const tagInvalidationObj = features.tagInvalidation as Record<string, unknown> | undefined;
    const tagInvalidationEnabled = tagInvalidationObj?.enabled === true;
    const crossTabSyncVal = features.crossTabSync;
    if (crossTabSyncVal === true && !tagInvalidationEnabled) {
      errors.push("crossTabSync requires tagInvalidation to be enabled");
    }

    const backgroundSyncVal = features.backgroundSync;
    const mutationQueueVal = features.mutationQueue as Record<string, unknown> | undefined;
    if (mutationQueueVal && typeof mutationQueueVal === "object") {
      const mq = mutationQueueVal;
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
      if (mq.retryBackoffMs !== undefined && (typeof mq.retryBackoffMs !== "number" || mq.retryBackoffMs < 0 || !Number.isInteger(mq.retryBackoffMs))) {
        errors.push("features.mutationQueue.retryBackoffMs must be a non-negative integer");
      }
    }
    const mqEnabled = mutationQueueVal?.enabled === true;
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
