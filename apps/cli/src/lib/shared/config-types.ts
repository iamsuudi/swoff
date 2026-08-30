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

export interface CachingStrategyConfig {
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
  storageThreshold?: number;
}

export interface CachingNavigationConfig {
  mode: "spa" | "ssr" | "default";
  preload?: boolean;
  fallback: string;
  precacheRoutes?: string[];
  rules?: NavigationRule[];
}

export interface CachingConfig {
  enabled: boolean;
  strategy: CachingStrategyConfig;
  navigation: CachingNavigationConfig;
  precache?: PrecacheConfig;
  requestBatchWindowMs: number;
  refetchQueue: RefetchQueueConfig;
  mutationQueue: MutationQueueConfig;
  tagInvalidation: TagInvalidationConfig;
  graphql: GqlConfig;
  serverPush: ServerPushConfig;
}

export interface ServiceWorkerConfig {
  autoActivate: boolean;
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
  | "vike"
  | "react"
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
    /** Online/offline detection with periodic heartbeat. Explicit opt-in. */
    connectivity: ConnectivityConfig;
    /** Web Push API notifications (SW push event handling). Explicit opt-in. */
    pushNotifications: boolean;
    pwa: {
      enabled: boolean;
      preventDefaultInstall: boolean;
    };
    /** Session/identity management. Top-level, does not depend on caching. */
    auth: AuthConfig;
    /** SW lifecycle only. Strategy/navigation/precache live under caching. */
    serviceWorker: ServiceWorkerConfig;
    /** The caching umbrella. When disabled, the SW has no fetch listener. */
    caching: CachingConfig;
  };
  build: {
    swOutput: string;
    swoffPath?: string;
    swUrl?: string;
    precacheDirs?: Record<string, PrecacheDirConfig>;
  };
}

export const DEFAULT_SWOFF_PATH = "swoff";

/**
 * Resolve the swoff source directory. Generated configs express the default as
 * "." (or omit it); both normalize to the same "swoff" directory.
 */
export function resolveSwoffPath(swoffPath?: string): string {
  if (!swoffPath || swoffPath === ".") return DEFAULT_SWOFF_PATH;
  return swoffPath;
}

export const KNOWN_FEATURES = [
  "connectivity",
  "pushNotifications",
  "pwa",
  "auth",
  "serviceWorker",
  "caching",
] as const;

export const OBJECT_FEATURES = [
  "connectivity",
  "pwa",
  "auth",
  "serviceWorker",
  "caching",
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

export const defaultCaching: CachingConfig = {
  enabled: false,
  strategy: {
    default: "cache-first",
    maxRuntimeCacheAge: 2592000,
    normalizeKey: false,
    ignoreQueryParams: [],
    timeout: 10,
    storageThreshold: 80,
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
  precache: { concurrency: 1 },
  requestBatchWindowMs: 50,
  refetchQueue: { ...defaultRefetchQueue },
  mutationQueue: { ...defaultMutationQueue },
  tagInvalidation: { ...defaultTagInvalidation },
  graphql: { ...defaultGql },
  serverPush: { ...defaultServerPushConfig },
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
  return deepMerge(base, override) as SwoffConfig;
}

export const defaultConfig: SwoffConfig = {
  build: {
    swOutput: "dist",
    swoffPath: ".",
    precacheDirs: {},
  },
  features: {
    connectivity: { ...defaultConnectivity },
    pushNotifications: false,
    pwa: {
      enabled: false,
      preventDefaultInstall: false,
    },
    auth: { ...defaultAuth },
    serviceWorker: {
      autoActivate: false,
    },
    caching: { ...defaultCaching },
  },
};