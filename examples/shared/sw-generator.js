/**
 * Swoff Service Worker Generator
 * 
 * Generates a service worker based on swoff.config.json configuration.
 * 
 * @example
 * import { generate } from './sw-generator.js';
 * generate();
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Generate the service worker
 * @param {Object} options - Generator options
 * @param {string} options.rootDir - Root directory of the project (defaults to project root)
 * @param {boolean} options.verbose - Enable verbose logging
 */
export function generate(options = {}) {
  const { rootDir = join(__dirname, "..", ".."), verbose = false } = options;
  
  const pkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));
  const template = readFileSync(join(__dirname, "sw-template.js"), "utf8");

  // Default configuration
  const defaultConfig = {
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

// Load user configuration with JSON-first fallback
let userConfig = {};
let configSource = null;

// Try to find and load configuration file
const findConfigFile = () => {
  const possibleFiles = [
    "swoff.config.json",
    "swoff.config.js",
    "swoff.config.mjs",
    "swoff.config.cjs"
  ];
  
  for (const file of possibleFiles) {
    const configPath = join(__dirname, "..", "..", file);
    if (existsSync(configPath)) {
      return configPath;
    }
  }
  
  return null;
};

const loadConfig = () => {
  const configPath = findConfigFile();
  
  if (!configPath) {
    console.log("ℹ️ No configuration file found, using defaults");
    return defaultConfig;
  }
  
  try {
    if (configPath.endsWith('.json')) {
      // Load JSON config
      userConfig = JSON.parse(readFileSync(configPath, "utf8"));
      configSource = "JSON";
      console.log("✅ JSON configuration file loaded successfully");
    } else {
      // Load JS/TS config (fallback)
      const configModule = eval(`(${readFileSync(configPath, "utf8")})`);
      userConfig = configModule.default || configModule;
      configSource = "JavaScript/TypeScript";
      console.log("✅ JavaScript/TypeScript configuration file loaded successfully");
    }
    
    console.log("📋 Config source:", configSource);
    console.log("📋 Config version:", userConfig.version || "from-package");
    
    return { ...defaultConfig, ...userConfig };
  } catch (error) {
    console.warn("Warning: Could not load configuration file, using defaults", error.message);
    return defaultConfig;
  }
};

const config = loadConfig();

// Check if config generation is enabled
if (!config.enabled) {
  console.log("Swoff config generation disabled. Using custom code mode.");
  process.exit(0);
}

// Get version from package.json or config
const version = config.version === "from-package" ? (pkg.version || "1.0.0") : config.version;

// Generate enhanced service worker with config
const generateServiceWorker = (config) => {
  const { version, minSupportedVersion, serviceWorker, features } = config;
  
  // Basic assets to cache
  const baseAssets = ['/', '/index.html'];
  
  // Add PWA assets if enabled
  const pwaAssets = features.pwa ? [
    '/manifest.json',
  ] : [];
  
  const ASSETS_TO_CACHE = [...baseAssets, ...pwaAssets];
  
  let sw = template;
  
  // Replace placeholders with config-driven content
  sw = sw.replace(
    "// [[CACHE_NAME]]",
    `CACHE_NAME = 'sw-v${version}'`
  );
  
  sw = sw.replace(
    "// [[ASSETS_LIST]]",
    `ASSETS_TO_CACHE = ${JSON.stringify(ASSETS_TO_CACHE, null, 2)}`
  );
  
  // Add enhanced fetch handler based on config
  const fetchHandler = generateFetchHandler(serviceWorker, features);
  sw = sw.replace(
    "// [[FETCH_HANDLER]]",
    fetchHandler
  );
  
  // Add activate handler with version cleanup
  const activateHandler = generateActivateHandler(features.versionedSw);
  sw = sw.replace(
    "// [[ACTIVATE_HANDLER]]",
    activateHandler
  );
  
  // Add install handler
  const installHandler = generateInstallHandler(features);
  sw = sw.replace(
    "// [[INSTALL_HANDLER]]", 
    installHandler
  );
  
  // Add configuration comments at the top
  const configHeader = generateConfigHeader(config);
  sw = configHeader + "\n\n" + sw;
  
  return sw;
};

// Generate fetch handler based on cache strategy
const generateFetchHandler = (swConfig, features) => {
  const { defaultStrategy, strategies, maxCacheEntries, maxCacheAge } = swConfig;
  
  let handler = `
// Enhanced fetch handler with configurable caching strategies
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  
  // Determine cache strategy for this request
  const strategy = determineCacheStrategy(event.request.url, strategies || {}, defaultStrategy);
  
  event.respondWith(
    handleRequestWithStrategy(event.request, strategy)
  );
});

// Cache strategy determination function
function determineCacheStrategy(url, customStrategies, defaultStrategy) {
  // Check custom strategies first
  for (const [pattern, strategy] of Object.entries(customStrategies)) {
    if (url.includes(pattern)) {
      return strategy;
    }
  }
  return defaultStrategy;
}

// Request handling with different cache strategies
async function handleRequestWithStrategy(request, strategy) {
  const cache = await caches.open(CACHE_NAME);
  
  switch (strategy) {
    case "cache-first":
      return cacheFirstStrategy(request, cache);
    case "network-first": 
      return networkFirstStrategy(request, cache);
    case "stale-while-revalidate":
      return staleWhileRevalidateStrategy(request, cache);
    case "cache-only":
      return cacheOnlyStrategy(request, cache);
    case "network-only":
      return networkOnlyStrategy(request, cache);
    default:
      return cacheFirstStrategy(request, cache);
  }
}

// Cache-first strategy: return cached version, then fetch
async function cacheFirstStrategy(request, cache) {
  const cached = await cache.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response("Offline", { status: 503 });
  }
}

// Network-first strategy: fetch first, then cache
async function networkFirstStrategy(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

// Stale-while-revalidate: return cached, fetch update in background
async function staleWhileRevalidateStrategy(request, cache) {
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  return cached || fetchPromise;
}

// Cache-only strategy: only return cached versions
async function cacheOnlyStrategy(request, cache) {
  return cache.match(request) || new Response("Not in cache", { status: 404 });
}

// Network-only strategy: always fetch from network
async function networkOnlyStrategy(request, cache) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response("Network error", { status: 503 });
  }
}`;
  
  return handler;
};

// Generate activate handler
const generateActivateHandler = (versionedSw) => {
  if (versionedSw) {
    return `
// Activate handler with version cleanup
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ),
    ),
  );
});`;
  } else {
    return `
// Activate handler - versioned service worker disabled
self.addEventListener("activate", (event) => {
  // Skip cleanup when versioned SW is disabled
  event.waitUntil(Promise.resolve());
});`;
  }
};

// Generate install handler
const generateInstallHandler = (features) => {
  let installCode = `
// Install handler
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
}`;
  
  if (features.offlineReads || features.mutationQueue) {
    installCode += `
  
  // Initialize offline support features
  event.waitUntil(initializeOfflineSupport());`;
  }
  
  return installCode;
};

// Generate configuration header with documentation
const generateConfigHeader = (config) => {
  return `/**
 * Swoff Service Worker - Auto-Generated
 * 
 * This file was automatically generated from swoff.config.${configSource?.toLowerCase() || 'json'}
 * DO NOT EDIT MANUALLY - changes will be overwritten on next build
 * 
 * Configuration used:
 * • Version: ${config.version}
 * • Versioned SW: ${config.features.versionedSw ? "Enabled" : "Disabled"}
 * • Offline Reads: ${config.features.offlineReads ? "Enabled" : "Disabled"}
 * • Mutation Queue: ${config.features.mutationQueue ? "Enabled" : "Disabled"}
 * • Default Strategy: ${config.serviceWorker.defaultStrategy}
 * • Auto Update: ${config.serviceWorker.autoUpdate ? "Enabled" : "Disabled"}
 * • PWA Support: ${config.features.pwa ? "Enabled" : "Disabled"}
 * 
 * Features can be configured in swoff.config.json
 * See documentation for more details: https://swoff.ai/docs
 */
`;
};

// Generate the service worker
const sw = generateServiceWorker(config);

// Write output files
const outputDir = join(__dirname, "..", "..", config.build.outputDir);
const swFilename = config.build.swFilename;

writeFileSync(join(outputDir, `${swFilename}-v${version}.js`), sw);
writeFileSync(join(outputDir, "version.json"), JSON.stringify({
  version: version,
  minSupportedVersion: config.minSupportedVersion,
  generatedAt: new Date().toISOString(),
  configEnabled: config.enabled,
  configSource: configSource,
}, null, 2));

console.log(`✅ Swoff service worker generated successfully!`);
console.log(`📁 Output: ${outputDir}/${swFilename}-v${version}.js`);
console.log(`📄 Version info: ${outputDir}/version.json`);
console.log(`ℹ️  Configuration source: ${configSource || "defaults"}`);
