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
      strategies: Record<string, string>;
      maxCacheEntries?: number;
      maxCacheAge?: number;
      runtimeCacheName?: string;
      clearRuntimeOnUpdate: boolean;
      navigationMode: "spa" | "default";
      spaEntry: string;
    };
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
  "mutationQueue",
  "backgroundSync",
  "auth",
  "crossTabSync",
  "tagInvalidation",
  "clientRegistration",
] as const;

export const OBJECT_FEATURES = ["pwa", "serviceWorker", "auth"] as const;

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

function normalizeSwVersion(ver: unknown): SwVersionConfig {
  if (ver && typeof ver === "object") return { ...defaultVersionConfig, ...(ver as Partial<SwVersionConfig>) };
  return defaultVersionConfig;
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
      clearRuntimeOnUpdate: false,
      navigationMode: "spa",
      spaEntry: "/index.html",
    },
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
  features: {
    ...defaultConfig.features,
    serviceWorker: {
      ...defaultConfig.features.serviceWorker,
      version: {
        ...defaultVersionConfig,
        minSupportedVersion: "1.0.0",
      },
      strategies: {
        "/api/*": "network-first",
        "/static/*": "cache-first",
      },
    },
  },
};
