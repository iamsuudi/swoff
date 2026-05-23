export interface AuthConfig {
  enabled: boolean;
  type: "cookie" | "bearer" | "custom";
  loginPath: string;
  logoutPath: string;
  refreshPath: string;
  userEndpoint: string;
}

export interface SwoffConfig {
  $schema?: string;
  enabled: boolean;
  version: string;
  minSupportedVersion: string;
  serviceWorker: {
    autoRegister: boolean;
    autoActivate: boolean;
    defaultStrategy: string;
    strategies: Record<string, string>;
    maxCacheEntries?: number;
    maxCacheAge?: number;
    runtimeCacheName?: string;
    clearRuntimeOnUpdate: boolean;
    navigationMode: "spa" | "default";
    spaEntry: string;
  };
  features: {
    pwa: {
      enabled: boolean;
      preventDefaultInstall: boolean;
    };
    indexeddb: {
      enabled: boolean;
      name: string;
      stores: string[];
    };
    versionedSw: boolean;
    mutationQueue: boolean;
    backgroundSync: boolean;
    auth: AuthConfig;
    crossTabSync: boolean;
    tagInvalidation: boolean;
    clientRegistration: boolean;
  };
  build: {
    outputDir: string;
    swFilename: string;
  };
}

export const KNOWN_FEATURES = [
  "versionedSw",
  "mutationQueue",
  "backgroundSync",
  "auth",
  "crossTabSync",
  "tagInvalidation",
  "clientRegistration",
] as const;

export const OBJECT_FEATURES = ["pwa", "indexeddb", "auth"] as const;

export const VALID_STRATEGIES = [
  "cache-first",
  "network-first",
  "stale-while-revalidate",
  "cache-only",
  "network-only",
] as const;

export const API_PREFIXES = ["api", "v1", "v2", "v3", "rest", "graphql", "gql"];

function normalizeAuth(auth: unknown): AuthConfig {
  if (typeof auth === "boolean") return { ...defaultAuth, enabled: auth };
  if (auth && typeof auth === "object") return { ...defaultAuth, ...(auth as Partial<AuthConfig>) };
  return defaultAuth;
}

export function mergeConfigs(base: SwoffConfig, override: Partial<SwoffConfig>): SwoffConfig {
  return {
    ...base,
    ...override,
    serviceWorker: { ...base.serviceWorker, ...override.serviceWorker },
    features: {
      ...base.features,
      ...override.features,
      pwa: { ...base.features.pwa, ...override.features?.pwa },
      indexeddb: { ...base.features.indexeddb, ...override.features?.indexeddb },
      auth: normalizeAuth(override.features?.auth),
    },
    build: { ...base.build, ...override.build },
  };
}

export const defaultAuth: AuthConfig = {
  enabled: false,
  type: "bearer",
  loginPath: "/api/login",
  logoutPath: "/api/logout",
  refreshPath: "/api/refresh",
  userEndpoint: "/api/me",
};

export const defaultConfig: SwoffConfig = {
  enabled: true,
  version: "from-package",
  minSupportedVersion: "0.0.0",
  serviceWorker: {
    autoRegister: true,
    autoActivate: false,
    defaultStrategy: "cache-first",
    strategies: {},
    clearRuntimeOnUpdate: false,
    navigationMode: "spa",
    spaEntry: "/index.html",
  },
  features: {
    pwa: {
      enabled: true,
      preventDefaultInstall: false,
    },
    indexeddb: {
      enabled: false,
      name: "app-db",
      stores: [],
    },
    versionedSw: true,
    mutationQueue: false,
    backgroundSync: false,
    auth: { ...defaultAuth },
    crossTabSync: true,
    tagInvalidation: true,
    clientRegistration: true,
  },
  build: {
    outputDir: "dist",
    swFilename: "sw",
  },
};

export const defaultInitConfig: Omit<SwoffConfig, "$schema"> & { $schema: string } = {
  ...defaultConfig,
  $schema: "https://swoff.netlify.app/schema/v1.json",
  minSupportedVersion: "1.0.0",
  serviceWorker: {
    ...defaultConfig.serviceWorker,
    strategies: {
      "/api/*": "network-first",
      "/static/*": "cache-first",
    },
  },
};
