import { KNOWN_FEATURES, OBJECT_FEATURES, VALID_STRATEGIES, REACTIVE_FIELDS, type SwoffConfig } from "../shared/config-types.js";
import { FEATURES } from "../shared/feature-registry.js";

export function validateConfig(config: SwoffConfig): string[] {
  const errors: string[] = [];

  const requiredFields: (keyof SwoffConfig)[] = ["features", "build"];
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
      } else if (key === "requestBatchWindowMs") {
        if (typeof value !== "number" || value < 0 || !Number.isInteger(value)) {
          errors.push("features.requestBatchWindowMs must be a non-negative integer");
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
      if (sw.autoActivate !== undefined && typeof sw.autoActivate !== "boolean") {
        errors.push("features.serviceWorker.autoActivate must be a boolean");
      }
      const precache = sw.precache as Record<string, unknown> | undefined;
      if (precache && typeof precache === "object") {
        if (precache.concurrency !== undefined && (typeof precache.concurrency !== "number" || precache.concurrency < 1 || !Number.isInteger(precache.concurrency))) {
          errors.push("features.serviceWorker.precache.concurrency must be a positive integer");
        }
      }
      const strategy = sw.strategy as Record<string, unknown> | undefined;
      if (strategy && typeof strategy === "object") {
        if (strategy.default !== undefined && !VALID_STRATEGIES.includes(strategy.default as (typeof VALID_STRATEGIES)[number])) {
          errors.push(
            `Invalid features.serviceWorker.strategy.default "${strategy.default}". Must be one of: ${VALID_STRATEGIES.join(", ")}`,
          );
        }
        const patterns = strategy.patterns as Record<string, unknown> | undefined;
        if (patterns && typeof patterns === "object") {
          for (const [pattern, entry] of Object.entries(patterns)) {
            if (typeof pattern !== "string" || pattern.trim() === "") {
              errors.push("features.serviceWorker.strategy.patterns keys must be non-empty strings");
              continue;
            }
            const opens = (pattern.match(/\{/g) || []).length;
            const closes = (pattern.match(/\}/g) || []).length;
            if (opens !== closes) {
              errors.push(`features.serviceWorker.strategy.patterns["${pattern}"] has unbalanced braces`);
            }
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
          if (reactive.staleTime !== undefined && (typeof reactive.staleTime !== "number" || reactive.staleTime < 0)) {
            errors.push("features.serviceWorker.strategy.reactive.staleTime must be a non-negative number");
          }
          if (reactive.refetchInterval !== undefined && (typeof reactive.refetchInterval !== "number" || reactive.refetchInterval < 0 || !Number.isInteger(reactive.refetchInterval))) {
            errors.push("features.serviceWorker.strategy.reactive.refetchInterval must be a non-negative integer");
          }
          if (reactive.refetchOnReconnect !== undefined && typeof reactive.refetchOnReconnect !== "boolean") {
            errors.push("features.serviceWorker.strategy.reactive.refetchOnReconnect must be a boolean");
          }
          if (reactive.refetchOnFocus !== undefined && typeof reactive.refetchOnFocus !== "boolean") {
            errors.push("features.serviceWorker.strategy.reactive.refetchOnFocus must be a boolean");
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
              if (rule.fallback !== undefined && typeof rule.fallback !== "string") {
                errors.push(`features.serviceWorker.navigation.rules[${i}].fallback must be a string`);
              }
            }
          }
        }
        const retry = navigation.retry as Record<string, unknown> | undefined;
        if (retry !== undefined) {
          // navigation.retry is deprecated and ignored
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
      const retry = refetchQueue.retry as Record<string, unknown> | undefined;
      if (retry !== undefined) {
        if (typeof retry !== "object" || retry === null) {
          errors.push("features.refetchQueue.retry must be an object");
        } else {
          if (retry.maxRetries !== undefined && (typeof retry.maxRetries !== "number" || retry.maxRetries < 0 || !Number.isInteger(retry.maxRetries))) {
            errors.push("features.refetchQueue.retry.maxRetries must be a non-negative integer");
          }
          if (retry.backoffMs !== undefined && (typeof retry.backoffMs !== "number" || retry.backoffMs < 0 || !Number.isInteger(retry.backoffMs))) {
            errors.push("features.refetchQueue.retry.backoffMs must be a non-negative integer");
          }
          if (retry.maxBackoffMs !== undefined && (typeof retry.maxBackoffMs !== "number" || retry.maxBackoffMs < 0 || !Number.isInteger(retry.maxBackoffMs))) {
            errors.push("features.refetchQueue.retry.maxBackoffMs must be a non-negative integer");
          }
          if (retry.jitterMs !== undefined && (typeof retry.jitterMs !== "number" || retry.jitterMs < 0 || !Number.isInteger(retry.jitterMs))) {
            errors.push("features.refetchQueue.retry.jitterMs must be a non-negative integer");
          }
        }
      }
    }

    const tagInvalidationVal = features.tagInvalidation as Record<string, unknown> | undefined;
    if (tagInvalidationVal && typeof tagInvalidationVal === "object") {
      const ti = tagInvalidationVal as Record<string, unknown>;
      if (ti.debounceMs !== undefined && (typeof ti.debounceMs !== "number" || ti.debounceMs < 0 || !Number.isInteger(ti.debounceMs))) {
        errors.push("features.tagInvalidation.debounceMs must be a non-negative integer");
      }
      if (ti.skipPrefixes !== undefined && (!Array.isArray(ti.skipPrefixes) || !(ti.skipPrefixes as unknown[]).every((p) => typeof p === "string"))) {
        errors.push("features.tagInvalidation.skipPrefixes must be an array of strings");
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
      const mqRetry = mq.retry as Record<string, unknown> | undefined;
      if (mqRetry !== undefined) {
        if (typeof mqRetry !== "object" || mqRetry === null) {
          errors.push("features.mutationQueue.retry must be an object");
        } else {
          if (mqRetry.maxRetries !== undefined && (typeof mqRetry.maxRetries !== "number" || mqRetry.maxRetries < 0 || !Number.isInteger(mqRetry.maxRetries))) {
            errors.push("features.mutationQueue.retry.maxRetries must be a non-negative integer");
          }
          if (mqRetry.backoffMs !== undefined && (typeof mqRetry.backoffMs !== "number" || mqRetry.backoffMs < 0 || !Number.isInteger(mqRetry.backoffMs))) {
            errors.push("features.mutationQueue.retry.backoffMs must be a non-negative integer");
          }
          if (mqRetry.maxBackoffMs !== undefined && (typeof mqRetry.maxBackoffMs !== "number" || mqRetry.maxBackoffMs < 0 || !Number.isInteger(mqRetry.maxBackoffMs))) {
            errors.push("features.mutationQueue.retry.maxBackoffMs must be a non-negative integer");
          }
          if (mqRetry.jitterMs !== undefined && (typeof mqRetry.jitterMs !== "number" || mqRetry.jitterMs < 0 || !Number.isInteger(mqRetry.jitterMs))) {
            errors.push("features.mutationQueue.retry.jitterMs must be a non-negative integer");
          }
        }
      }
      if (mq.backgroundSync !== undefined && typeof mq.backgroundSync !== "boolean") {
        errors.push("features.mutationQueue.backgroundSync must be a boolean");
      }
      const backgroundSyncVal = mq.backgroundSync === true;
      if (backgroundSyncVal && mq.enabled !== true) {
        errors.push("features.mutationQueue.backgroundSync requires mutationQueue to be enabled");
      }
      if (backgroundSyncVal) {
        const authBg = features.auth as Record<string, unknown> | undefined;
        if (authBg?.enabled === true && authBg?.type !== "cookie") {
          errors.push("features.mutationQueue.backgroundSync is only supported with auth type \"cookie\" — the service worker cannot access bearer tokens");
        }
      }
    }

    const VALID_AUTH_TYPES = ["cookie", "bearer", "custom"];
    const auth = features.auth as Record<string, unknown> | undefined;
    if (auth && typeof auth === "object") {
      if (auth.enabled !== undefined && typeof auth.enabled !== "boolean") {
        errors.push("features.auth.enabled must be a boolean");
      }
      if (auth.type !== undefined && !VALID_AUTH_TYPES.includes(auth.type as string)) {
        errors.push(`features.auth.type must be one of: ${VALID_AUTH_TYPES.join(", ")}`);
      }
      if (auth.routePaths !== undefined) {
        if (!Array.isArray(auth.routePaths) || !(auth.routePaths as unknown[]).every((p) => typeof p === "string")) {
          errors.push("features.auth.routePaths must be an array of strings");
        }
      }
    }

    const graphql = features.graphql as Record<string, unknown> | undefined;
    if (graphql && typeof graphql === "object") {
      if (graphql.enabled !== undefined && typeof graphql.enabled !== "boolean") {
        errors.push("features.graphql.enabled must be a boolean");
      }
      if (graphql.endpoints !== undefined) {
        if (!Array.isArray(graphql.endpoints) || !(graphql.endpoints as unknown[]).every((e) => typeof e === "string")) {
          errors.push("features.graphql.endpoints must be an array of strings");
        }
      }
    }

    if (features.pushNotifications !== undefined && typeof features.pushNotifications !== "boolean") {
      errors.push("features.pushNotifications must be a boolean");
    }
    const sp = features.serverPush as Record<string, unknown> | undefined;
    if (sp && typeof sp === "object") {
      if (sp.enabled !== undefined && typeof sp.enabled !== "boolean") {
        errors.push("features.serverPush.enabled must be a boolean");
      }
      if (sp.enabled && features.auth && typeof features.auth === "object" && (features.auth as Record<string, unknown>).enabled && (features.auth as Record<string, unknown>).type === "bearer") {
        errors.push("features.serverPush is not supported with bearer auth — use cookie auth instead");
      }
      if (sp.enabled) {
        const ti = features.tagInvalidation as Record<string, unknown> | undefined;
        if (ti && typeof ti === "object" && ti.enabled === false) {
          errors.push("features.serverPush requires features.tagInvalidation to be enabled");
        }
      }
      if (sp.type !== undefined && !["sse", "websocket"].includes(sp.type as string)) {
        errors.push('features.serverPush.type must be "sse" or "websocket"');
      }
      if (sp.endpoint !== undefined && typeof sp.endpoint !== "string") {
        errors.push("features.serverPush.endpoint must be a string");
      }
      if (sp.reconnectDelayMs !== undefined && (typeof sp.reconnectDelayMs !== "number" || sp.reconnectDelayMs < 0 || !Number.isInteger(sp.reconnectDelayMs))) {
        errors.push("features.serverPush.reconnectDelayMs must be a non-negative integer (capped at 30000ms)");
      }
      if (sp.reconnectDelayMs !== undefined && typeof sp.reconnectDelayMs === "number" && sp.reconnectDelayMs > 30000) {
        errors.push("features.serverPush.reconnectDelayMs is capped at 30000ms (30s)");
      }
    }

  }

  const fw = config.framework;
  const VALID_FRAMEWORKS = ["nextjs", "remix", "tanstack-start-react", "astro", "nuxt", "sveltekit", "react-spa", "vue", "svelte", "vanilla", "no-bundler"];
  if (fw !== undefined) {
    if (typeof fw !== "string") {
      errors.push(`framework must be a string, got ${typeof fw}`);
    } else if (!VALID_FRAMEWORKS.includes(fw)) {
      errors.push(`framework must be one of: ${VALID_FRAMEWORKS.join(", ")}`);
    }
  }

  if (config.build) {
    const build = config.build as Record<string, unknown>;
    if (build.swOutput !== undefined) {
      if (typeof build.swOutput !== "string" || !build.swOutput) {
        errors.push("build.swOutput must be a non-empty string");
      }
    }
    if (build.swoffPath !== undefined) {
      if (typeof build.swoffPath !== "string" || !build.swoffPath) {
        errors.push("build.swoffPath must be a non-empty string");
      }
    }
    if (build.swFilename !== undefined) {
      if (typeof build.swFilename !== "string" || !build.swFilename) {
        errors.push("build.swFilename must be a non-empty string");
      }
    }
    if (build.swUrl !== undefined) {
      if (typeof build.swUrl !== "string" || !build.swUrl) {
        errors.push("build.swUrl must be a non-empty string");
      }
    }
    if (build.precacheDirs !== undefined) {
      if (typeof build.precacheDirs !== "object" || build.precacheDirs === null || Array.isArray(build.precacheDirs)) {
        errors.push("build.precacheDirs must be an object");
      } else {
        for (const [dir, value] of Object.entries(build.precacheDirs as Record<string, unknown>)) {
          if (typeof dir !== "string" || !dir) {
            errors.push("build.precacheDirs keys must be non-empty strings");
            continue;
          }
          if (typeof value !== "object" || value === null) {
            errors.push(`build.precacheDirs["${dir}"] must be an object`);
            continue;
          }
          const obj = value as Record<string, unknown>;
          if (typeof obj.prefix !== "string") {
            errors.push(`build.precacheDirs["${dir}"].prefix must be a string`);
          }
          if (obj.matchExtensions !== undefined) {
            if (!Array.isArray(obj.matchExtensions) || !obj.matchExtensions.every((e: unknown) => typeof e === "string")) {
              errors.push(`build.precacheDirs["${dir}"].matchExtensions must be an array of strings`);
            }
          }
          if (obj.stripExtensions !== undefined) {
            if (!Array.isArray(obj.stripExtensions) || !obj.stripExtensions.every((e: unknown) => typeof e === "string")) {
              errors.push(`build.precacheDirs["${dir}"].stripExtensions must be an array of strings`);
            }
          }
          if (obj.stripSuffixes !== undefined) {
            if (!Array.isArray(obj.stripSuffixes) || !obj.stripSuffixes.every((s: unknown) => typeof s === "string")) {
              errors.push(`build.precacheDirs["${dir}"].stripSuffixes must be an array of strings`);
            }
          }
          if (obj.excludeDirs !== undefined) {
            if (!Array.isArray(obj.excludeDirs) || !obj.excludeDirs.every((d: unknown) => typeof d === "string")) {
              errors.push(`build.precacheDirs["${dir}"].excludeDirs must be an array of strings`);
            }
          }
          if (obj.excludeFiles !== undefined) {
            if (!Array.isArray(obj.excludeFiles) || !obj.excludeFiles.every((f: unknown) => typeof f === "string")) {
              errors.push(`build.precacheDirs["${dir}"].excludeFiles must be an array of strings`);
            }
          }
        }
      }
    }
  }

  const swoffConfig = config;

  if (config.features) {
    const auth = swoffConfig.features.auth;
    for (const [, feature] of Object.entries(FEATURES)) {
      if (!feature.checkEnabled(swoffConfig)) continue;

      const missing = feature.requires.filter((depId) => {
        const dep = FEATURES[depId];
        return dep && !dep.checkEnabled(swoffConfig);
      });
      for (const depId of missing) {
        errors.push(`"${feature.label}" requires "${FEATURES[depId]?.label ?? depId}" to be enabled`);
      }

      if (auth?.enabled && feature.incompatibleAuthTypes.includes(auth.type)) {
        errors.push(`"${feature.label}" is not compatible with auth type "${auth.type}" — use "cookie" instead`);
      }
    }
  }

  return errors;
}
