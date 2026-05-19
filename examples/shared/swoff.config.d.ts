/**
 * Swoff Configuration Schema
 * 
 * This file defines the complete configuration options for Swoff.
 * Create a swoff.config.json file in your project to configure Swoff behavior.
 * 
 * @example
 * // swoff.config.json
 * {
 *   "enabled": true,
 *   "version": "from-package",
 *   "minSupportedVersion": "1.0.0",
 *   "serviceWorker": {
 *     "autoUpdate": false,
 *     "defaultStrategy": "cache-first",
 *     "strategies": {
 *       "/api/*": "network-first",
 *       "/static/*": "cache-first"
 *     }
 *   },
 *   "features": {
 *     "versionedSw": true,
 *     "offlineReads": true,
 *     "mutationQueue": false
 *   }
 * }
 */

export interface SwoffConfig {
  /**
   * Enable or disable config-driven generation
   * Set to false to disable regeneration and use custom code
   * 
   * @default true
   */
  enabled: boolean;

  /**
   * Service Worker version source
   * "from-package" reads from package.json version
   * Or specify exact version like "1.0.0"
   * 
   * @default "from-package"
   */
  version: "from-package" | string;

  /**
   * Minimum supported version for forced updates
   * Users on versions below this will be forced to update
   * 
   * @default "0.0.0"
   */
  minSupportedVersion: string;

  /**
   * Service Worker configuration
   */
  serviceWorker: {
    /**
     * Auto-update behavior
     * true = Silent update (auto-activate new SW)
     * false = Show update prompt to user
     * 
     * @default false
     */
    autoUpdate: boolean;

    /**
     * Default caching strategy for all requests
     * 
     * @default "cache-first"
     * @see CacheStrategy
     */
    defaultStrategy: CacheStrategy;

    /**
     * Custom cache strategies for specific URL patterns
     * Patterns are matched using simple string matching
     * 
     * @example
     * {
     *   "/api/*": "network-first",
     *   "/static/*": "cache-first",
     *   "/*": "cache-first"
     * }
     */
    strategies?: Record<string, CacheStrategy>;

    /**
     * Maximum number of cached entries
     * 
     * @default 100
     */
    maxCacheEntries: number;

    /**
     * Maximum age of cached entries in milliseconds
     * 
     * @default 7 days (7 * 24 * 60 * 60 * 1000)
     */
    maxCacheAge: number;

    /**
     * Custom runtime cache name
     * 
     * @default "swoff-runtime"
     */
    runtimeCacheName: string;
  };

  /**
   * Feature toggles - enable/disable specific functionality
   */
  features: {
    /**
     * Enable versioned service worker (prevents silent updates)
     * 
     * @default true
     */
    versionedSw: boolean;

    /**
     * Cache API responses for offline read access
     * 
     * @default true
     */
    offlineReads: boolean;

    /**
     * Queue offline writes and sync when back online
     * 
     * @default false
     */
    mutationQueue: boolean;

    /**
     * Enable Background Sync API (Chrome/Edge only)
     * 
     * @default false
     */
    backgroundSync: boolean;

    /**
     * Enable PWA installability
     * Note: Manifest handling should be done separately
     * 
     * @default true
     */
    pwa: boolean;

    /**
     * Enable auth integration
     * 
     * @default false
     */
    auth: boolean;

    /**
     * Cross-tab cache invalidation sync
     * 
     * @default true
     */
    crossTabSync: boolean;

    /**
     * Tag-based cache invalidation
     * 
     * @default true
     */
    tagInvalidation: boolean;
  };

  /**
   * IndexedDB configuration
   */
  database?: {
    /**
     * Database name
     * 
     * @default "app-db"
     */
    name: string;

    /**
     * Object store names (user defines their own schema)
     * This is for documentation/reference only
     */
    stores?: string[];
  };

  /**
   * Build output configuration
   */
  build: {
    /**
     * Output directory for generated files
     * 
     * @default "dist"
     */
    outputDir: string;

    /**
     * Service worker output filename (without version)
     * 
     * @default "sw"
     */
    swFilename: string;
  };
}

/**
 * Available cache strategies
 */
export type CacheStrategy = 
  | "cache-first" 
  | "network-first" 
  | "stale-while-revalidate"
  | "cache-only"
  | "network-only";

/**
 * Default configuration
 */
export const defaultConfig: SwoffConfig = {
  enabled: true,
  version: "from-package",
  minSupportedVersion: "0.0.0",
  serviceWorker: {
    autoUpdate: false,
    defaultStrategy: "cache-first",
    maxCacheEntries: 100,
    maxCacheAge: 7 * 24 * 60 * 60 * 1000,
    runtimeCacheName: "swoff-runtime",
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

export default defaultConfig;