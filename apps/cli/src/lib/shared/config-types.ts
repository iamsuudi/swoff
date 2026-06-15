export interface GqlConfig {
  enabled: boolean;
  endpoints: string[];
}

export type AuthType = "cookie" | "bearer" | "custom";

export interface AuthConfig {
  enabled: boolean;
  type: AuthType;
  routePaths: string[];
}

export interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs: number;
  jitterMs: number;
}

export interface MutationQueueConfig {
  enabled: boolean;
  batchSize: number;
  batchDelayMs: number;
  backgroundSync: boolean;
  retry: RetryConfig;
}

export interface RefetchQueueConfig {
  batchSize: number;
  batchDelayMs: number;
  retry: RetryConfig;
}

export const REACTIVE_FIELDS = [
  "staleTime",
  "refetchInterval",
  "refetchOnReconnect",
  "refetchOnFocus",
] as const;

export interface StrategyEntry {
  strategy: string;
  timeout?: number;
  staleTime?: number;
  refetchInterval?: number;
  refetchOnReconnect?: boolean;
  refetchOnFocus?: boolean;
}

export interface NavigationRule {
  match: string;
  fallback?: string;
}

export interface TagInvalidationConfig {
  debounceMs?: number;
  skipPrefixes?: string[];
  patterns?: Record<string, string[]>;
  singularization?: Record<string, string>;
  cascading?: Record<string, string[]>;
}

export interface RealtimeConfig {
  pushNotifications: boolean;
  vapidPublicKey?: string;
  serverPush: {
    enabled: boolean;
    type: "sse" | "websocket";
    endpoint: string;
    reconnectDelayMs: number;
  };
}

export interface PrecacheDirConfig {
  prefix: string;
  extensions?: string[];
  stripExtension?: boolean;
  stripSuffixes?: string[];
}

export interface SwoffConfig {
  $schema?: string;
  framework?:
    | "nextjs"
    | "remix"
    | "tanstack-start-react"
    | "astro"
    | "nuxt"
    | "sveltekit"
    | "react-spa"
    | "vue"
    | "svelte"
    | "vanilla";
  features: {
    pwa: {
      enabled: boolean;
      preventDefaultInstall: boolean;
    };
    serviceWorker: {
      version: string;
      autoActivate: boolean;
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
        clearRuntimeOnUpdate: boolean;
        maxRuntimeCacheAge?: number;
        normalizeKey?: boolean;
        ignoreQueryParams?: string[];
        timeout?: number;
      };
      navigation: {
        mode: "spa" | "ssr" | "default";
        preload?: boolean;
        fallback: string;
        precacheRoutes?: string[];
        rules?: NavigationRule[];
      };
    };
    requestBatchWindowMs: number;
    refetchQueue: RefetchQueueConfig;
    mutationQueue: MutationQueueConfig;
    auth: AuthConfig;
    tagInvalidation: TagInvalidationConfig;
    graphql: GqlConfig;
    realtime: RealtimeConfig;
  };
  build: {
    outputDir: string;
    swFilename: string;
    precacheDirs?: Record<string, PrecacheDirConfig>;
  };
}

export const KNOWN_FEATURES = [
  "refetchQueue",
  "mutationQueue",
  "auth",
  "graphql",
  "realtime",
] as const;

export const OBJECT_FEATURES = [
  "pwa",
  "serviceWorker",
  "auth",
  "graphql",
  "realtime",
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
  type: "cookie",
  routePaths: ["/login", "/logout", "/register", "/api/login", "/api/logout", "/api/register", "/api/refresh", "/api/me"],
};

export const defaultGql: GqlConfig = {
  enabled: false,
  endpoints: ["/graphql"],
};

export const defaultMutationQueue: MutationQueueConfig = {
  enabled: false,
  batchSize: 1,
  batchDelayMs: 0,
  backgroundSync: false,
  retry: { maxRetries: 5, backoffMs: 1000, maxBackoffMs: 30000, jitterMs: 250 },
};

export const defaultRefetchQueue: RefetchQueueConfig = {
  batchSize: 5,
  batchDelayMs: 1000,
  retry: { maxRetries: 3, backoffMs: 1000, maxBackoffMs: 10000, jitterMs: 100 },
};

export const defaultRealtimeConfig: RealtimeConfig = {
  pushNotifications: false,
  vapidPublicKey: "",
  serverPush: {
    enabled: false,
    type: "sse",
    endpoint: "/api/events",
    reconnectDelayMs: 5000,
  },
};

export const defaultTagInvalidation: TagInvalidationConfig = {
  debounceMs: 0,
  skipPrefixes: [...API_PREFIXES],
  patterns: {},
  singularization: {},
  cascading: {},
};

export function deepMerge<T>(
  base: T,
  override: Partial<T> | Record<string, unknown>,
): T {
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
    build: { ...base.build, ...override.build },
    features: {
      ...base.features,
      ...override.features,
      requestBatchWindowMs:
        override.features?.requestBatchWindowMs ??
        base.features.requestBatchWindowMs,
      pwa: { ...base.features.pwa, ...override.features?.pwa },
      serviceWorker: {
        ...base.features.serviceWorker,
        ...override.features?.serviceWorker,
        version:
          override.features?.serviceWorker?.version ??
          base.features.serviceWorker.version ??
          "hash",
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
      } as AuthConfig,
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
      realtime: {
        ...defaultRealtimeConfig,
        ...base.features.realtime,
        ...override.features?.realtime,
        serverPush: {
          ...defaultRealtimeConfig.serverPush,
          ...base.features.realtime?.serverPush,
          ...override.features?.realtime?.serverPush,
        },
      },
    },
  };
}

export const defaultConfig: SwoffConfig = {
  build: {
    outputDir: "dist",
    swFilename: "sw",
    precacheDirs: {},
  },
  features: {
    requestBatchWindowMs: 50,
    pwa: {
      enabled: true,
      preventDefaultInstall: false,
    },
    serviceWorker: {
      version: "package",
      autoActivate: false,
      strategy: {
        default: "cache-first",
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
      },
    },
    refetchQueue: { ...defaultRefetchQueue },
    mutationQueue: { ...defaultMutationQueue },
    auth: { ...defaultAuth },
    tagInvalidation: { ...defaultTagInvalidation },
    graphql: { ...defaultGql },
    realtime: {
      ...defaultRealtimeConfig,
      serverPush: { ...defaultRealtimeConfig.serverPush },
    },
  },
};

export const defaultInitConfig: Omit<SwoffConfig, "$schema"> & {
  $schema: string;
} = {
  $schema: "https://swoff.netlify.app/schema/v1.json",
  framework: "vanilla",
  features: {
    requestBatchWindowMs: 50,
    pwa: { enabled: true, preventDefaultInstall: false },
    serviceWorker: {
      version: "package",
      autoActivate: false,
      navigation: {
        mode: "spa",
        preload: true,
        fallback: "",
        precacheRoutes: [],
        rules: [],
      },
      strategy: {
        default: "cache-first",
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
    auth: { ...defaultAuth },
    tagInvalidation: { ...defaultTagInvalidation },
    graphql: { ...defaultGql },
    realtime: {
      ...defaultRealtimeConfig,
      serverPush: { ...defaultRealtimeConfig.serverPush },
    },
  },
  build: { outputDir: "dist", swFilename: "sw", precacheDirs: {} },
};
