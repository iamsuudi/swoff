export interface GqlConfig {
  enabled: boolean;
  endpoint: string;
}

export interface AuthConfig {
  enabled: boolean;
  type: "cookie" | "bearer" | "custom";
  refreshPath: string;
  userEndpoint: string;
}

export interface MutationQueueConfig {
  enabled: boolean;
  batchSize: number;
  batchDelayMs: number;
  maxRetries: number;
  retryBackoffMs: number;
}

export interface RefetchQueueConfig {
  batchSize: number;
  batchDelayMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export const REACTIVE_FIELDS = [
  "staleTime",
  "refetchInterval",
  "refetchOnReconnect",
  "refetchOnFocus",
] as const;

export interface StrategyEntry {
  strategy: string;
  staleTime?: number;
  refetchInterval?: number;
  refetchOnReconnect?: boolean;
  refetchOnFocus?: boolean;
}

export interface NavigationRule {
  match: string;
  policy?: "cache-first" | "network-first" | "network-only" | "stale-while-revalidate";
  fallback?: string;
}

export interface NavigationRetryConfig {
  enabled: boolean;
  intervalMs?: number;
  maxRetries?: number;
}

export interface TagInvalidationConfig {
  enabled?: boolean;
  debounceMs?: number;
  prefixes?: string[];
  patterns?: Record<string, string[]>;
  singularization?: Record<string, string>;
  cascading?: Record<string, string[]>;
}

export const CONFIG_VERSION = 1;

export interface SwoffConfig {
  $schema?: string;
  configVersion?: number;
  enabled: boolean;
  framework?: "nextjs" | "remix" | "astro" | "nuxt" | "sveltekit" | "react" | "vue" | "svelte" | "vanilla";
  apiBaseUrl?: string;
  features: {
    pwa: {
      enabled: boolean;
      preventDefaultInstall: boolean;
    };
    serviceWorker: {
      version: string;
      autoActivate: boolean;
      requestBatchWindowMs: number;
      strategy: {
        default: string;
        patterns: Record<string, string | StrategyEntry>;
        reactive: {
          defaults: {
            staleTime?: number;
            refetchInterval?: number;
            refetchOnReconnect?: boolean;
            refetchOnFocus?: boolean;
          };
        };
        mode?: "all" | "explicit-only";
        clearRuntimeOnUpdate: boolean;
        maxRuntimeCacheAge?: number;
        normalizeKey?: boolean;
        ignoreQueryParams?: string[];
        timeout?: number;
      };
      navigation: {
        mode: "spa" | "default" | "network-first" | "stale-while-revalidate" | "ssr";
        preload?: boolean;
        fallback: string;
        precacheRoutes?: string[];
        rules?: NavigationRule[];
        retry?: NavigationRetryConfig;
      };
    };
    refetchQueue: RefetchQueueConfig;
    mutationQueue: MutationQueueConfig;
    backgroundSync: boolean;
    auth: AuthConfig;
    crossTabSync: boolean;
    tagInvalidation: TagInvalidationConfig;
    graphql: GqlConfig;
    pushNotifications: {
      enabled: boolean;
      vapidPublicKey?: string;
    };
    serverPush: {
      enabled: boolean;
      type: "sse" | "websocket";
      endpoint: string;
      reconnectDelayMs: number;
    };
  };
  build: {
    outputDir: string;
    swFilename: string;
    precacheDirs?: Record<string, string>;
  };
}

export const KNOWN_FEATURES = [
  "refetchQueue",
  "mutationQueue",
  "backgroundSync",
  "auth",
  "crossTabSync",
  "tagInvalidation",
  "graphql",
  "pushNotifications",
  "serverPush",
] as const;

export const OBJECT_FEATURES = [
  "pwa",
  "serviceWorker",
  "auth",
  "pushNotifications",
  "graphql",
  "serverPush",
  "tagInvalidation",
  "mutationQueue",
  "refetchQueue",
] as const;

export const VALID_STRATEGIES = [
  "cache-first",
  "network-first",
  "stale-while-revalidate",
  "cache-only",
  "network-only",
  "reactive",
] as const;

export const API_PREFIXES = ["api", "v1", "v2", "v3", "rest", "graphql", "gql"];

export const defaultAuth: AuthConfig = {
  enabled: false,
  type: "bearer",
  refreshPath: "/api/refresh",
  userEndpoint: "/api/me",
};

export const defaultGql: GqlConfig = {
  enabled: false,
  endpoint: "/graphql",
};

export const defaultMutationQueue: MutationQueueConfig = {
  enabled: false,
  batchSize: 1,
  batchDelayMs: 0,
  maxRetries: 5,
  retryBackoffMs: 1000,
};

export const defaultRefetchQueue: RefetchQueueConfig = {
  batchSize: 5,
  batchDelayMs: 1000,
  maxRetries: 3,
  retryDelayMs: 1000,
};

export const defaultServerPush = {
  enabled: false,
  type: "sse" as const,
  endpoint: "/api/events",
  reconnectDelayMs: 5000,
};

export const defaultTagInvalidation: TagInvalidationConfig = {
  enabled: true,
  debounceMs: 0,
  prefixes: [...API_PREFIXES],
  patterns: {},
  singularization: {},
  cascading: {},
};

export function deepMerge<T>(base: T, override: Partial<T> | Record<string, unknown>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(override as Record<string, unknown>)) {
    const baseVal = (base as Record<string, unknown>)[key];
    const overrideVal = (override as Record<string, unknown>)[key];
    if (
      baseVal &&
      overrideVal &&
      typeof baseVal === "object" &&
      typeof overrideVal === "object" &&
      !Array.isArray(baseVal) &&
      !Array.isArray(overrideVal)
    ) {
      result[key] = deepMerge(baseVal, overrideVal);
    } else {
      result[key] = overrideVal ?? baseVal;
    }
  }
  return result as T;
}

export function mergeConfigs(
  base: SwoffConfig,
  override: Partial<SwoffConfig>,
): SwoffConfig {
  return {
    ...base,
    ...override,
    apiBaseUrl: override.apiBaseUrl ?? base.apiBaseUrl,
    features: {
      ...base.features,
      ...override.features,
      pwa: { ...base.features.pwa, ...override.features?.pwa },
      serviceWorker: {
        ...base.features.serviceWorker,
        ...override.features?.serviceWorker,
        version:
          override.features?.serviceWorker?.version ??
          base.features.serviceWorker.version ?? "package",
        strategy: {
          ...base.features.serviceWorker.strategy,
          ...override.features?.serviceWorker?.strategy,
          reactive: {
            defaults: {
              ...base.features.serviceWorker.strategy.reactive.defaults,
              ...override.features?.serviceWorker?.strategy?.reactive?.defaults,
            },
          },
        },
        navigation: {
          ...base.features.serviceWorker.navigation,
          ...override.features?.serviceWorker?.navigation,
        },
      },
      refetchQueue: {
        ...defaultRefetchQueue,
        ...base.features.refetchQueue,
        ...override.features?.refetchQueue,
      },
      mutationQueue: {
        ...defaultMutationQueue,
        ...base.features.mutationQueue,
        ...override.features?.mutationQueue,
      },
      auth: {
        ...defaultAuth,
        ...base.features.auth,
        ...override.features?.auth,
      },
      graphql: {
        ...defaultGql,
        ...base.features.graphql,
        ...override.features?.graphql,
      },
      tagInvalidation: {
        ...defaultTagInvalidation,
        ...base.features.tagInvalidation,
        ...override.features?.tagInvalidation,
      },
      pushNotifications: {
        ...base.features.pushNotifications,
        ...override.features?.pushNotifications,
      },
      serverPush: {
        ...defaultServerPush,
        ...base.features.serverPush,
        ...override.features?.serverPush,
      },
    },
    build: { ...base.build, ...override.build },
  };
}

export const defaultConfig: SwoffConfig = {
  configVersion: CONFIG_VERSION,
  enabled: true,
  apiBaseUrl: "",
  features: {
    pwa: {
      enabled: true,
      preventDefaultInstall: false,
    },
    serviceWorker: {
      version: "package",
      autoActivate: false,
      requestBatchWindowMs: 50,
      strategy: {
        default: "cache-first",
        mode: "all",
        clearRuntimeOnUpdate: false,
        maxRuntimeCacheAge: 2592000,
        normalizeKey: false,
        ignoreQueryParams: [],
        timeout: 10,
        patterns: {},
        reactive: {
          defaults: {
            staleTime: 0,
            refetchInterval: 0,
            refetchOnReconnect: false,
            refetchOnFocus: false,
          },
        },
      },
      navigation: {
        mode: "spa",
        preload: true,
        fallback: "",
        precacheRoutes: [],
        rules: [],
        retry: { enabled: false, intervalMs: 5000, maxRetries: 12 },
      },
    },
    refetchQueue: { ...defaultRefetchQueue },
    mutationQueue: { ...defaultMutationQueue },
    backgroundSync: false,
    auth: { ...defaultAuth },
    crossTabSync: true,
    tagInvalidation: { ...defaultTagInvalidation },
    graphql: { ...defaultGql },
    pushNotifications: { enabled: false },
    serverPush: { ...defaultServerPush },
  },
  build: {
    outputDir: "dist",
    swFilename: "sw",
    precacheDirs: {},
  },
};

export const defaultInitConfig: Omit<SwoffConfig, "$schema"> & {
  $schema: string;
} = {
  $schema: "https://swoff.netlify.app/schema/v1.json",
  configVersion: CONFIG_VERSION,
  enabled: true,
  framework: "vanilla",
  apiBaseUrl: "",
  features: {
    pwa: { enabled: true, preventDefaultInstall: false },
    serviceWorker: {
      version: "package",
      autoActivate: false,
      requestBatchWindowMs: 50,
      navigation: {
        mode: "spa",
        preload: true,
        fallback: "",
        precacheRoutes: [],
        rules: [],
        retry: { enabled: false, intervalMs: 5000, maxRetries: 12 },
      },
      strategy: {
        default: "cache-first",
        mode: "all",
        clearRuntimeOnUpdate: false,
        maxRuntimeCacheAge: 2592000,
        normalizeKey: false,
        ignoreQueryParams: [],
        timeout: 10,
        patterns: {
          "/api/*": "network-first",
          "/static/*": "cache-first",
        },
        reactive: {
          defaults: {
            staleTime: 0,
            refetchInterval: 0,
            refetchOnReconnect: false,
            refetchOnFocus: false,
          },
        },
      },
    },
    refetchQueue: { ...defaultRefetchQueue },
    mutationQueue: { ...defaultMutationQueue },
    backgroundSync: false,
    auth: { ...defaultAuth },
    crossTabSync: true,
    tagInvalidation: { ...defaultTagInvalidation },
    graphql: { ...defaultGql },
    pushNotifications: { enabled: false },
    serverPush: { ...defaultServerPush },
  },
  build: { outputDir: "dist", swFilename: "sw", precacheDirs: {} },
};
