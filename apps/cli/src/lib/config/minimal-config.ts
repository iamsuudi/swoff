import type { AuthType, PrecacheDirConfig } from "../shared/config-types.js";
import {
  defaultAuth,
  defaultCaching,
  defaultConnectivity,
  deepMerge,
} from "../shared/config-types.js";

export interface WizardAnswers {
  framework: string;
  swOutput: string;
  autoActivate: boolean;
  navMode: "spa" | "ssr" | "default";
  fallback: string;
  defaultStrategy: string;
  patterns?: Record<string, string>;
  ignoreQueryParams?: string[];
  pwaEnabled: boolean;
  authEnabled: boolean;
  authType?: string;
  connectivityEnabled: boolean;
  cachingEnabled: boolean;
  mutationEnabled: boolean;
  backgroundSync?: boolean;
  tagInvalidationEnabled: boolean;
  graphqlEnabled: boolean;
  serverPushEnabled: boolean;
  pushNotificationsEnabled: boolean;
  precacheDirs?: Record<string, PrecacheDirConfig>;
}

const defaultPrecacheEntry: PrecacheDirConfig = {
  prefix: "",
  matchExtensions: [],
  stripExtensions: [],
  stripSuffixes: [],
  excludeDirs: [],
  excludeFiles: [],
};

/**
 * Build a fully-explicit swoff.config.json from wizard answers.
 *
 * Rule: every ENABLED feature emits its complete subtree — all child fields
 * (booleans included) materialized from defaults + answers. Disabled optional
 * features are omitted entirely (absent has meant disabled in this schema).
 */
export function buildMinimalConfig(
  answers: WizardAnswers,
): Record<string, unknown> {
  const features: Record<string, unknown> = {};

  features.serviceWorker = {
    autoActivate: answers.autoActivate,
  };

  if (answers.connectivityEnabled) {
    features.connectivity = deepMerge(defaultConnectivity, {
      enabled: true,
    }) as unknown as Record<string, unknown>;
  }

  if (answers.pwaEnabled) {
    features.pwa = deepMerge(
      { enabled: false, preventDefaultInstall: false },
      { enabled: true },
    ) as unknown as Record<string, unknown>;
  }

  if (answers.authEnabled) {
    features.auth = deepMerge(defaultAuth, {
      enabled: true,
      type: (answers.authType || "cookie") as AuthType,
    }) as unknown as Record<string, unknown>;
  }

  // Everything cache-related lives under the caching umbrella.
  if (answers.cachingEnabled) {
    const caching = deepMerge(defaultCaching, {
      enabled: true,
      strategy: {
        default: answers.defaultStrategy,
        ...(answers.patterns ? { patterns: answers.patterns } : {}),
        ...(answers.ignoreQueryParams
          ? { ignoreQueryParams: answers.ignoreQueryParams }
          : {}),
      },
      navigation: {
        mode: answers.navMode,
        fallback: answers.fallback,
      },
    }) as unknown as Record<string, unknown>;

    if (answers.mutationEnabled) {
      (caching.mutationQueue as Record<string, unknown>).enabled = true;
      (caching.mutationQueue as Record<string, unknown>).backgroundSync =
        !!answers.backgroundSync;
    } else {
      delete caching.mutationQueue;
    }

    if (answers.graphqlEnabled) {
      (caching.graphql as Record<string, unknown>).enabled = true;
    } else {
      delete caching.graphql;
    }

    if (answers.tagInvalidationEnabled) {
      (caching.tagInvalidation as Record<string, unknown>).enabled = true;
    } else {
      delete caching.tagInvalidation;
    }

    if (answers.serverPushEnabled) {
      (caching.serverPush as Record<string, unknown>).enabled = true;
    } else {
      delete caching.serverPush;
    }

    if (answers.defaultStrategy !== "reactive") {
      delete (caching.strategy as Record<string, unknown>).reactive;
    }

    features.caching = caching;
  }

  if (answers.pushNotificationsEnabled) {
    features.pushNotifications = true;
  }

  const build: Record<string, unknown> = {
    swOutput: answers.swOutput,
    swoffPath: ".",
    swUrl: "/swoff.sw.js",
  };

  // precacheDirs is only emitted when the user opted in via the wizard.
  // Each entry is materialized with ALL its fields so the config is explicit.
  if (answers.precacheDirs && Object.keys(answers.precacheDirs).length > 0) {
    const precacheDirs: Record<string, PrecacheDirConfig> = {};
    for (const [dir, entry] of Object.entries(answers.precacheDirs)) {
      precacheDirs[dir] = { ...defaultPrecacheEntry, ...entry };
    }
    build.precacheDirs = precacheDirs;
  }

  return {
    $schema: "https://swoff.space/schema/v2.json",
    framework: answers.framework,
    features,
    build,
  };
}