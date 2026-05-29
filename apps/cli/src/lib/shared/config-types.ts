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

export interface SwVersionConfig {
  enabled: boolean;
  source: "from-package" | "manual";
  value?: string;
  minSupportedVersion: string;
}

export interface MutationQueueConfig {
  enabled: boolean;
  batchSize: number;
  batchDelayMs: number;
  maxRetries: number;
  retryBackoffMs: number;
}

export const REACTIVE_FIELDS = ["staleTime", "refetchInterval", "refetchOnReconnect", "refetchOnFocus"] as const;

export interface StrategyEntry {
  strategy: string;
  staleTime?: number;
  refetchInterval?: number;
  refetchOnReconnect?: boolean;
  refetchOnFocus?: boolean;
}

export interface TagInvalidationConfig {
  enabled: boolean;
  prefixes?: string[];
  patterns?: Record<string, string[]>;
  singularization?: Record<string, string>;
  cascading?: Record<string, string[]>;
  invalidation?: {
    debounceMs?: number;
    optimistic?: boolean;
  };
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
      version: SwVersionConfig;
      autoUpdate: boolean;
      autoActivate: boolean;
      defaultStrategy: string;
      strategies: Record<string, string | StrategyEntry>;
      cacheStrategy?: "all" | "explicit-only";
      clearRuntimeOnUpdate: boolean;
      navigationPreload?: boolean;
      navigationMode: "spa" | "default";
      spaEntry: string;
      staleTime?: number;
      refetchInterval?: number;
      refetchOnReconnect?: boolean;
      refetchOnFocus?: boolean;
      refetchBatchSize?: number;
      refetchBatchDelayMs?: number;
      refetchMaxRetries?: number;
      refetchRetryDelayMs?: number;
      ignoreQueryParams?: string[];
      normalizeCacheKey?: boolean;
    };
    mutationQueue: MutationQueueConfig;
    backgroundSync: boolean;
    auth: AuthConfig;
    crossTabSync: boolean;
    tagInvalidation: boolean | TagInvalidationConfig;
    graphql: GqlConfig;
    pushNotifications?: {
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
  "mutationQueue",
  "backgroundSync",
  "auth",
  "crossTabSync",
  "tagInvalidation",
  "graphql",
  "pushNotifications",
  "serverPush",
] as const;

export const OBJECT_FEATURES = ["pwa", "serviceWorker", "auth", "pushNotifications", "graphql", "serverPush", "tagInvalidation"] as const;

export const VALID_STRATEGIES = [
  "cache-first",
  "network-first",
  "stale-while-revalidate",
  "cache-only",
  "network-only",
  "reactive",
] as const;

export const API_PREFIXES = ["api", "v1", "v2", "v3", "rest", "graphql", "gql"];

function normalizeAuth(auth: unknown): AuthConfig {
  if (typeof auth === "boolean") return { ...defaultAuth, enabled: auth };
  if (auth && typeof auth === "object") return { ...defaultAuth, ...(auth as Partial<AuthConfig>) };
  return defaultAuth;
}

function normalizeSwVersion(ver: unknown): SwVersionConfig {
  if (ver && typeof ver === "object") return { ...defaultVersionConfig, ...(ver as Partial<SwVersionConfig>) };
  return defaultVersionConfig;
}

function normalizeGql(val: unknown): GqlConfig {
  if (typeof val === "boolean") return { ...defaultGql, enabled: val };
  if (val && typeof val === "object") return { ...defaultGql, ...(val as Partial<GqlConfig>) };
  return defaultGql;
}

function normalizeMutationQueue(val: unknown): MutationQueueConfig {
  if (typeof val === "boolean") return { ...defaultMutationQueue, enabled: val };
  if (val && typeof val === "object") return { ...defaultMutationQueue, ...(val as Partial<MutationQueueConfig>) };
  return defaultMutationQueue;
}

function normalizePushNotifications(val: unknown): { enabled: boolean; vapidPublicKey?: string } {
  if (typeof val === "boolean") return { enabled: val };
  if (val && typeof val === "object") return { enabled: false, ...(val as Partial<{ enabled: boolean; vapidPublicKey: string }>) };
  return { enabled: false };
}

function normalizeTagInvalidation(val: unknown): TagInvalidationConfig {
  if (typeof val === "boolean") return { ...defaultTagInvalidation, enabled: val };
  if (val && typeof val === "object") return { ...defaultTagInvalidation, ...(val as Partial<TagInvalidationConfig>) };
  return defaultTagInvalidation;
}

export function mergeConfigs(base: SwoffConfig, override: Partial<SwoffConfig>): SwoffConfig {
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
        version: normalizeSwVersion(override.features?.serviceWorker?.version),
      },
      auth: normalizeAuth(override.features?.auth),
      mutationQueue: normalizeMutationQueue(override.features?.mutationQueue),
      graphql: normalizeGql(override.features?.graphql),
      tagInvalidation: normalizeTagInvalidation(override.features?.tagInvalidation ?? base.features.tagInvalidation),
      pushNotifications: normalizePushNotifications(override.features?.pushNotifications ?? base.features.pushNotifications),
      serverPush: { ...defaultServerPush, ...base.features.serverPush, ...override.features?.serverPush },
    },
    build: { ...base.build, ...override.build },
  };
}

export const defaultAuth: AuthConfig = {
  enabled: false,
  type: "bearer",
  refreshPath: "/api/refresh",
  userEndpoint: "/api/me",
};

export const defaultVersionConfig: SwVersionConfig = {
  enabled: true,
  source: "from-package",
  minSupportedVersion: "0.0.0",
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

export const defaultServerPush = {
  enabled: false,
  type: "sse" as const,
  endpoint: "/api/events",
  reconnectDelayMs: 5000,
};

export const defaultTagInvalidation: TagInvalidationConfig = {
  enabled: true,
  prefixes: [...API_PREFIXES],
  patterns: {},
  singularization: {},
  cascading: {},
  invalidation: {
    debounceMs: 0,
    optimistic: false,
  },
};

export const defaultConfig: SwoffConfig = {
  enabled: true,
  features: {
    pwa: {
      enabled: true,
      preventDefaultInstall: false,
    },
    serviceWorker: {
      version: { ...defaultVersionConfig },
      autoUpdate: true,
      autoActivate: false,
      defaultStrategy: "cache-first",
      strategies: {},
      cacheStrategy: "all",
      clearRuntimeOnUpdate: false,
      navigationPreload: true,
      navigationMode: "spa",
      spaEntry: "/index.html",
      staleTime: 0,
      refetchInterval: 0,
      refetchOnReconnect: false,
      refetchOnFocus: false,
      refetchBatchSize: 5,
      refetchBatchDelayMs: 1000,
      refetchMaxRetries: 3,
      refetchRetryDelayMs: 1000,
      ignoreQueryParams: [],
      normalizeCacheKey: false,
    },
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

export const defaultInitConfig: Omit<SwoffConfig, "$schema"> & { $schema: string } = {
  $schema: "https://swoff.netlify.app/schema/v1.json",
  enabled: true,
  framework: "vanilla",
  features: {
    pwa: { enabled: true, preventDefaultInstall: false },
    serviceWorker: {
      version: { ...defaultVersionConfig, minSupportedVersion: "1.0.0" },
      autoUpdate: true,
      autoActivate: false,
      defaultStrategy: "cache-first",
      strategies: {
        "/api/*": "network-first",
        "/static/*": "cache-first",
      },
      cacheStrategy: "all",
      clearRuntimeOnUpdate: false,
      navigationPreload: true,
      navigationMode: "spa",
      spaEntry: "/index.html",
      staleTime: 0,
      refetchInterval: 0,
      refetchOnReconnect: false,
      refetchOnFocus: false,
      refetchBatchSize: 5,
      refetchBatchDelayMs: 1000,
      refetchMaxRetries: 3,
      refetchRetryDelayMs: 1000,
      ignoreQueryParams: [],
      normalizeCacheKey: false,
    },
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
