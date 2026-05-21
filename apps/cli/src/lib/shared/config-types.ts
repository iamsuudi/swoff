/**
 * Shared Swoff configuration types and defaults.
 * Used by both the CLI commands and generators.
 */

export interface SwoffConfig {
  $schema?: string;
  enabled: boolean;
  version: string;
  minSupportedVersion: string;
  serviceWorker: {
    autoRegister: boolean;
    autoUpdate: boolean;
    defaultStrategy: string;
    strategies: Record<string, string>;
    maxCacheEntries?: number;
    maxCacheAge?: number;
    runtimeCacheName?: string;
  };
  features: {
    versionedSw: boolean;
    offlineReads: boolean;
    mutationQueue: boolean;
    backgroundSync: boolean;
    pwa: boolean;
    auth: boolean;
    crossTabSync: boolean;
    tagInvalidation: boolean;
    clientRegistration: boolean;
    indexeddb: boolean;
  };
  pwa: {
    preventDefaultInstall: boolean;
  };
  database: {
    name: string;
    stores: string[];
  };
  build: {
    outputDir: string;
    swFilename: string;
  };
}

export const KNOWN_FEATURES = [
  "versionedSw",
  "offlineReads",
  "mutationQueue",
  "backgroundSync",
  "pwa",
  "auth",
  "crossTabSync",
  "tagInvalidation",
  "clientRegistration",
  "indexeddb",
] as const;

export const VALID_STRATEGIES = [
  "cache-first",
  "network-first",
  "stale-while-revalidate",
  "cache-only",
  "network-only",
] as const;

export const API_PREFIXES = ["api", "v1", "v2", "v3", "rest", "graphql", "gql"];

export const defaultConfig: SwoffConfig = {
  enabled: true,
  version: "from-package",
  minSupportedVersion: "0.0.0",
  serviceWorker: {
    autoRegister: true,
    autoUpdate: false,
    defaultStrategy: "cache-first",
    strategies: {},
  },
  features: {
    versionedSw: true,
    offlineReads: true,
    mutationQueue: false,
    backgroundSync: false,
    pwa: true,
    auth: false,
    crossTabSync: true,
    tagInvalidation: true,
    clientRegistration: true,
    indexeddb: false,
  },
  pwa: {
    preventDefaultInstall: false,
  },
  database: {
    name: "app-db",
    stores: [],
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
