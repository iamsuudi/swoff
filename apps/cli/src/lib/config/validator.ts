import { KNOWN_FEATURES, OBJECT_FEATURES, VALID_STRATEGIES, REACTIVE_FIELDS, CONFIG_VERSION } from "../shared/config-types.js";

export function validateConfig(config: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (config.enabled !== undefined && typeof config.enabled !== "boolean") {
    errors.push("enabled must be a boolean");
  }

  if (config.configVersion !== undefined) {
    if (typeof config.configVersion !== "number") {
      errors.push("configVersion must be a number");
    } else if (config.configVersion !== CONFIG_VERSION) {
      errors.push(`configVersion must be ${CONFIG_VERSION}, got ${config.configVersion}`);
    }
  }

  if (config.apiBaseUrl !== undefined && typeof config.apiBaseUrl !== "string") {
    errors.push("apiBaseUrl must be a string");
  }

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
      } else if (key === "backgroundSync" || key === "crossTabSync") {
        if (typeof value !== "boolean") {
          errors.push(`Feature "${key}" must be a boolean, got ${typeof value}`);
        }
      } else {
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
      if (sw.version !== undefined && typeof sw.version !== "string") {
        errors.push('features.serviceWorker.version must be a string');
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
        if (strategy.maxRuntimeCacheAge !== undefined && (typeof strategy.maxRuntimeCacheAge !== "number" || strategy.maxRuntimeCacheAge < 0 || !Number.isInteger(strategy.maxRuntimeCacheAge))) {
          errors.push("features.serviceWorker.strategy.maxRuntimeCacheAge must be a non-negative integer");
        }
        if (strategy.ignoreQueryParams !== undefined && (!Array.isArray(strategy.ignoreQueryParams) || !(strategy.ignoreQueryParams as unknown[]).every((p: unknown) => typeof p === "string"))) {
          errors.push("features.serviceWorker.strategy.ignoreQueryParams must be an array of strings");
        }
        if (strategy.timeout !== undefined && (typeof strategy.timeout !== "number" || strategy.timeout <= 0)) {
          errors.push("features.serviceWorker.strategy.timeout must be a positive number");
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
        if (navigation.mode !== undefined && !["spa", "default", "ssr"].includes(navigation.mode as string)) {
          errors.push('features.serviceWorker.navigation.mode must be "spa", "default", or "ssr"');
        }
        if (navigation.fallback !== undefined && typeof navigation.fallback !== "string") {
          errors.push("features.serviceWorker.navigation.fallback must be a string");
        }
        if (navigation.preload !== undefined && typeof navigation.preload !== "boolean") {
          errors.push("features.serviceWorker.navigation.preload must be a boolean");
        }
        if (navigation.precacheRoutes !== undefined) {
          if (!Array.isArray(navigation.precacheRoutes) || !(navigation.precacheRoutes as unknown[]).every((r) => typeof r === "string")) {
            errors.push("features.serviceWorker.navigation.precacheRoutes must be an array of strings");
          }
        }
        const rules = navigation.rules as unknown[] | undefined;
        if (rules !== undefined) {
          if (!Array.isArray(rules)) {
            errors.push("features.serviceWorker.navigation.rules must be an array");
          } else {
            for (let i = 0; i < rules.length; i++) {
              const rule = rules[i] as Record<string, unknown>;
              if (!rule || typeof rule !== "object") {
                errors.push(`features.serviceWorker.navigation.rules[${i}] must be an object`);
                continue;
              }
              if (typeof rule.match !== "string" || rule.match.trim() === "") {
                errors.push(`features.serviceWorker.navigation.rules[${i}].match must be a non-empty string`);
              }
              const validPolicies = ["cache-first", "network-first", "network-only", "stale-while-revalidate"];
              if (rule.policy !== undefined && !validPolicies.includes(rule.policy as string)) {
                errors.push(`features.serviceWorker.navigation.rules[${i}].policy must be one of: ${validPolicies.join(", ")}`);
              }
              if (rule.fallback !== undefined && typeof rule.fallback !== "string") {
                errors.push(`features.serviceWorker.navigation.rules[${i}].fallback must be a string`);
              }
            }
          }
        }
        const retry = navigation.retry as Record<string, unknown> | undefined;
        if (retry !== undefined) {
          if (typeof retry !== "object") {
            errors.push("features.serviceWorker.navigation.retry must be an object");
          } else {
            if (retry.enabled !== undefined && typeof retry.enabled !== "boolean") {
              errors.push("features.serviceWorker.navigation.retry.enabled must be a boolean");
            }
            if (retry.intervalMs !== undefined && (typeof retry.intervalMs !== "number" || retry.intervalMs < 0 || !Number.isInteger(retry.intervalMs))) {
              errors.push("features.serviceWorker.navigation.retry.intervalMs must be a non-negative integer");
            }
            if (retry.maxRetries !== undefined && (typeof retry.maxRetries !== "number" || retry.maxRetries < 0 || !Number.isInteger(retry.maxRetries))) {
              errors.push("features.serviceWorker.navigation.retry.maxRetries must be a non-negative integer");
            }
          }
        }
      }
      if (sw.requestBatchWindowMs !== undefined && (typeof sw.requestBatchWindowMs !== "number" || sw.requestBatchWindowMs < 0 || !Number.isInteger(sw.requestBatchWindowMs))) {
        errors.push("features.serviceWorker.requestBatchWindowMs must be a non-negative integer");
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
      if (ti.enabled !== undefined && typeof ti.enabled !== "boolean") {
        errors.push("features.tagInvalidation.enabled must be a boolean");
      }
      if (ti.debounceMs !== undefined && (typeof ti.debounceMs !== "number" || ti.debounceMs < 0 || !Number.isInteger(ti.debounceMs))) {
        errors.push("features.tagInvalidation.debounceMs must be a non-negative integer");
      }
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
    if (backgroundSyncVal === true) {
      const authBg = features.auth as Record<string, unknown> | undefined;
      if (authBg?.enabled === true && authBg?.type !== "cookie") {
        errors.push("backgroundSync is not supported with auth type \"bearer\" or \"custom\" — tokens must not be stored in IndexedDB");
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
      if (serverPush.reconnectDelayMs !== undefined && (typeof serverPush.reconnectDelayMs !== "number" || serverPush.reconnectDelayMs < 0 || !Number.isInteger(serverPush.reconnectDelayMs))) {
        errors.push("features.serverPush.reconnectDelayMs must be a non-negative integer (capped at 30000ms)");
      }
      if (serverPush.reconnectDelayMs !== undefined && typeof serverPush.reconnectDelayMs === "number" && serverPush.reconnectDelayMs > 30000) {
        errors.push("features.serverPush.reconnectDelayMs is capped at 30000ms (30s)");
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
  const VALID_FRAMEWORKS = ["nextjs", "remix", "astro", "nuxt", "sveltekit", "react", "vue", "svelte", "vanilla"];
  if (fw !== undefined && typeof fw === "string" && !VALID_FRAMEWORKS.includes(fw)) {
    errors.push(`framework must be one of: ${VALID_FRAMEWORKS.join(", ")}`);
  }

  if (config.build) {
    const build = config.build as Record<string, unknown>;
    if (build.outputDir !== undefined) {
      if (typeof build.outputDir !== "string" || !build.outputDir) {
        errors.push("build.outputDir must be a non-empty string");
      }
    }
    if (build.swFilename !== undefined) {
      if (typeof build.swFilename !== "string" || !build.swFilename) {
        errors.push("build.swFilename must be a non-empty string");
      }
    }
    if (build.precacheDirs !== undefined) {
      if (typeof build.precacheDirs !== "object" || build.precacheDirs === null || Array.isArray(build.precacheDirs)) {
        errors.push("build.precacheDirs must be an object (Record<string, string>)");
      } else {
        for (const [dir, url] of Object.entries(build.precacheDirs as Record<string, unknown>)) {
          if (typeof dir !== "string" || !dir) {
            errors.push("build.precacheDirs keys must be non-empty strings");
          }
          if (typeof url !== "string") {
            errors.push(`build.precacheDirs["${dir}"] must be a string`);
          }
        }
      }
    }
  }

  return errors;
}
