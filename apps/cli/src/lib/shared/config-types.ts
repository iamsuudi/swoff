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
  enabled: boolean;
  debounceMs?: number;
  skipPrefixes?: string[];
  patterns?: Record<string, string[]>;
  singularization?: Record<string, string>;
  cascading?: Record<string, string[]>;
}

export interface ConnectivityConfig {
  enabled: boolean;
  heartbeatIntervalMs: number;
}

export interface ServerPushConfig {
  enabled: boolean;
  type: "sse" | "websocket";
  endpoint: string;
  reconnectDelayMs: number;
}

export interface PrecacheConfig {
  concurrency: number;
  delayMs?: number;
}

export interface PrecacheDirConfig {
  prefix: string;
  matchExtensions?: string[];
  stripExtensions?: string[];
  stripSuffixes?: string[];
  excludeDirs?: string[];
  excludeFiles?: string[];
}

export interface SwoffConfig {
  $schema?: string;
  framework?:
    | "nextjs"
    | "remix"
    | "tanstack-start-react"
    | "astro"
    | "nuxt"
    | "quasar"
    | "vitepress"
    | "sveltekit"
    | "react-spa"
    | "vue"
    | "svelte"
    | "qwik"
    | "preact"
    | "angular"
    | "solid"
    | "lit"
    | "alpine"
    | "marko"
    | "stimulus"
    | "jquery"
    | "htmx"
    | "no-bundler"
    | "vanilla";
  features: {
    pwa: {
      enabled: boolean;
      preventDefaultInstall: boolean;
    };
    serviceWorker: {
      autoActivate: boolean;
      precache?: PrecacheConfig;
      strategy: {
        default: "cache-first" | "network-first" | "stale-while-revalidate" | "cache-only" | "network-only" | "reactive";
        patterns: Record<string, string | StrategyEntry>;
        reactive: {
            staleTime?: number;
            refetchInterval?: number;
            refetchOnReconnect?: boolean;
            refetchOnFocus?: boolean;
          };
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
    connectivity: ConnectivityConfig;
    tagInvalidation: TagInvalidationConfig;
    graphql: GqlConfig;
    pushNotifications: boolean;
    serverPush: ServerPushConfig;
  };
  build: {
    swOutput: string;
    swoffPath?: string;
    swFilename: string;
    swUrl?: string;
    precacheDirs?: Record<string, PrecacheDirConfig>;
  };
}

export const KNOWN_FEATURES = [
  "refetchQueue",
  "mutationQueue",
  "auth",
  "graphql",
  "pushNotifications",
] as const;

export const OBJECT_FEATURES = [
  "pwa",
  "serviceWorker",
  "auth",
  "graphql",
  "tagInvalidation",
  "mutationQueue",
  "refetchQueue",
  "serverPush",
  "connectivity",
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

export const defaultServerPushConfig: ServerPushConfig = {
  enabled: false,
  type: "sse",
  endpoint: "/api/events",
  reconnectDelayMs: 5000,
};

export const defaultConnectivity: ConnectivityConfig = {
  enabled: false,
  heartbeatIntervalMs: 30000,
};

export const defaultTagInvalidation: TagInvalidationConfig = {
  enabled: false,
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
      typeof baseVal === "object" && baseVal !== null &&
      typeof overrideVal === "object" && overrideVal !== null &&
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
        precache: {
          ...base.features.serviceWorker.precache,
          ...override.features?.serviceWorker?.precache,
          concurrency: override.features?.serviceWorker?.precache?.concurrency ?? base.features.serviceWorker.precache?.concurrency ?? 1,
        },
        strategy: {
          ...base.features.serviceWorker.strategy,
          ...override.features?.serviceWorker?.strategy,
          reactive: {
            ...base.features.serviceWorker.strategy.reactive,
            ...override.features?.serviceWorker?.strategy?.reactive,
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
      connectivity: {
        ...defaultConnectivity,
        ...base.features.connectivity,
        ...override.features?.connectivity,
      },
      tagInvalidation: {
        ...defaultTagInvalidation,
        ...base.features.tagInvalidation,
        ...override.features?.tagInvalidation,
      },
      pushNotifications:
        override.features?.pushNotifications ??
        base.features.pushNotifications,
      serverPush: {
        ...defaultServerPushConfig,
        ...base.features.serverPush,
        ...override.features?.serverPush,
      },
    },
  };
}

export const defaultConfig: SwoffConfig = {
  build: {
    swOutput: "dist",
    swoffPath: "swoff",
    swFilename: "sw",
    precacheDirs: {},
  },
  features: {
    requestBatchWindowMs: 50,
    pwa: {
      enabled: false,
      preventDefaultInstall: false,
    },
    serviceWorker: {
      autoActivate: false,
      precache: { concurrency: 1 },
      strategy: {
        default: "cache-first",
        maxRuntimeCacheAge: 2592000,
        normalizeKey: false,
        ignoreQueryParams: [],
        timeout: 10,
        patterns: {},
        reactive: {
          staleTime: 0,
          refetchInterval: 0,
          refetchOnReconnect: false,
          refetchOnFocus: false,
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
    connectivity: { ...defaultConnectivity },
    tagInvalidation: { ...defaultTagInvalidation },
    graphql: { ...defaultGql },
    pushNotifications: false,
    serverPush: { ...defaultServerPushConfig },
  },
};

export const defaultInitConfig: Omit<SwoffConfig, "$schema"> & {
  $schema: string;
} = {
  $schema: "https://swoff.netlify.app/schema/v1.json",
  framework: "vanilla",
  features: {
    requestBatchWindowMs: 50,
    pwa: { enabled: false, preventDefaultInstall: false },
    serviceWorker: {
      autoActivate: false,
      precache: { concurrency: 1 },
      navigation: {
        mode: "spa",
        preload: true,
        fallback: "",
        precacheRoutes: [],
        rules: [],
      },
      strategy: {
        default: "cache-first",
        maxRuntimeCacheAge: 2592000,
        normalizeKey: false,
        ignoreQueryParams: [],
        timeout: 10,
        patterns: {
          "/api/*": "network-first",
          "/static/*": "cache-first",
        },
        reactive: {
          staleTime: 0,
          refetchInterval: 0,
          refetchOnReconnect: false,
          refetchOnFocus: false,
        },
      },
    },
    refetchQueue: { ...defaultRefetchQueue },
    mutationQueue: { ...defaultMutationQueue },
    auth: { ...defaultAuth },
    connectivity: { ...defaultConnectivity },
    tagInvalidation: { ...defaultTagInvalidation },
    graphql: { ...defaultGql },
    pushNotifications: false,
    serverPush: { ...defaultServerPushConfig },
  },
  build: { swOutput: "dist", swoffPath: "swoff", swFilename: "sw", precacheDirs: {} },
};
