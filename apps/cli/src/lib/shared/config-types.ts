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

export interface TagInvalidationConfig {
  debounceMs?: number;
  prefixes?: string[];
  patterns?: Record<string, string[]>;
  singularization?: Record<string, string>;
  cascading?: Record<string, string[]>;
}

export interface SwoffConfig {
  $schema?: string;
  enabled: boolean;
  framework?: "react" | "vue" | "svelte" | "vanilla";
  features: {
    pwa: {
      enabled: boolean;
      preventDefaultInstall: boolean;
    };
    serviceWorker: {
      version: string | false;
      minSupportedVersion: string;
      autoUpdate: boolean;
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
      };
      navigation: {
        mode: "spa" | "default";
        preload?: boolean;
        fallback: string;
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
  debounceMs: 0,
  prefixes: [...API_PREFIXES],
  patterns: {},
  singularization: {},
  cascading: {},
};

export function mergeConfigs(
  base: SwoffConfig,
  override: Partial<SwoffConfig>,
): SwoffConfig {
  return {
    ...base,
    ...override,
    features: {
      ...base.features,
      ...override.features,
      pwa: { ...base.features.pwa, ...override.features?.pwa },
      serviceWorker: {
        ...base.features.serviceWorker,
        ...override.features?.serviceWorker,
        version:
          override.features?.serviceWorker?.version ??
          base.features.serviceWorker.version,
        minSupportedVersion:
          override.features?.serviceWorker?.minSupportedVersion ??
          base.features.serviceWorker.minSupportedVersion,
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
  enabled: true,
  features: {
    pwa: {
      enabled: true,
      preventDefaultInstall: false,
    },
    serviceWorker: {
      version: "package",
      minSupportedVersion: "0.0.0",
      autoUpdate: true,
      autoActivate: false,
      requestBatchWindowMs: 50,
      strategy: {
        default: "cache-first",
        mode: "all",
        clearRuntimeOnUpdate: false,
        maxRuntimeCacheAge: 2592000,
        normalizeKey: false,
        ignoreQueryParams: [],
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
        fallback: "/index.html",
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
  },
};

export const defaultInitConfig: Omit<SwoffConfig, "$schema"> & {
  $schema: string;
} = {
  $schema: "https://swoff.netlify.app/schema/v1.json",
  enabled: true,
  framework: "vanilla",
  features: {
    pwa: { enabled: true, preventDefaultInstall: false },
    serviceWorker: {
      version: "package",
      minSupportedVersion: "0.0.0",
      autoUpdate: true,
      autoActivate: false,
      requestBatchWindowMs: 50,
      navigation: {
        mode: "spa",
        preload: true,
        fallback: "/index.html",
      },
      strategy: {
        default: "cache-first",
        mode: "all",
        clearRuntimeOnUpdate: false,
        maxRuntimeCacheAge: 2592000,
        normalizeKey: false,
        ignoreQueryParams: [],
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
  build: { outputDir: "dist", swFilename: "sw" },
};
