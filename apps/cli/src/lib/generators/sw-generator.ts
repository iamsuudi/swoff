/**
 * Swoff Service Worker Generator
 * 
 * Generates a service worker based on swoff.config.json configuration.
 * Can be run as CLI or imported as a module.
 * 
 * CLI Usage:
 *   node sw-generator.js [--project-root <path>] [--package-dir <path>]
 * 
 * Module Usage:
 *   import { generate } from './sw-generator.js';
 *   generate({ projectRoot: '/path/to/project' });
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

// Parse CLI arguments
const args = process.argv.slice(2);
const projectRootArg = args.findIndex(arg => arg === '--project-root');
const packageDirArg = args.findIndex(arg => arg === '--package-dir');

const passedProjectRoot = projectRootArg !== -1 ? args[projectRootArg + 1] : null;
const passedPackageDir = packageDirArg !== -1 ? args[packageDirArg + 1] : null;

// Get package directory (where this script is located)
const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = passedPackageDir || join(scriptDir, '..');
const projectRoot = passedProjectRoot || process.cwd();

/**
 * Generate the service worker
 * @param {Object} options - Generator options
 * @param {string} options.projectRoot - Root directory of the user's project
 * @param {string} options.packageDir - Directory where swoff package is installed
 */
export function generate(options = {}) {
  const { 
    projectRoot: optProjectRoot = projectRoot, 
    packageDir: optPackageDir = packageDir 
  } = options;
  
  // Find package.json in user's project
  const pkgPath = join(optProjectRoot, "package.json");
  let pkg = { version: "1.0.0" };
  
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    } catch (e) {
      console.warn("Could not read package.json, using default version");
    }
  }
  
  // Load template from package directory
  const templatePath = join(optPackageDir, 'src/lib/templates/sw-template.js');
  let template;
  
  if (existsSync(templatePath)) {
    template = readFileSync(templatePath, "utf8");
  } else {
    // Fallback: inline template
    template = getDefaultTemplate();
  }

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
    build: {
      outputDir: "dist",
      swFilename: "sw",
    },
  };

  // Load user config
  let userConfig = {};
  let configSource = "defaults";
  
  const configPath = join(optProjectRoot, "swoff.config.json");
  
  if (existsSync(configPath)) {
    try {
      userConfig = JSON.parse(readFileSync(configPath, "utf8"));
      configSource = "JSON";
    } catch (e) {
      console.warn("Could not parse swoff.config.json, using defaults");
    }
  } else {
    // Check for JS config
    const jsConfigPath = join(optProjectRoot, "swoff.config.js");
    if (existsSync(jsConfigPath)) {
      try {
        const module = await import(jsConfigPath);
        userConfig = module.default || module;
        configSource = "JavaScript";
      } catch (e) {
        console.warn("Could not load swoff.config.js, using defaults");
      }
    }
  }
  
  const config = { ...defaultConfig, ...userConfig };
  
  // Check if config generation is disabled
  if (!config.enabled) {
    console.log("Swoff config generation disabled. Using custom code mode.");
    return;
  }
  
  // Get version
  const version = config.version === "from-package" ? (pkg.version || "1.0.0") : config.version;
  
  // Generate service worker
  const sw = generateServiceWorker(config, version);
  
  // Write output files
  const outputDir = join(optProjectRoot, config.build.outputDir);
  const swFilename = config.build.swFilename;
  
  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    // Just try to write - will fail gracefully if parent doesn't exist
  }
  
  try {
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
    console.log(`ℹ️  Configuration source: ${configSource}`);
  } catch (err) {
    console.error(`Error writing files: ${err.message}`);
    console.log("Make sure the output directory exists:");
    console.log(`  mkdir -p ${outputDir}`);
  }
}

function generateServiceWorker(config, version) {
  const { serviceWorker, features } = config;
  
  // Basic assets to cache
  const baseAssets = ['/', '/index.html'];
  const pwaAssets = features.pwa ? ['/manifest.json'] : [];
  const ASSETS_TO_CACHE = [...baseAssets, ...pwaAssets];
  
  let sw = getDefaultTemplate();
  
  // Replace placeholders
  sw = sw.replace(
    "// [[CACHE_NAME]]",
    `CACHE_NAME = 'sw-v${version}'`
  );
  
  sw = sw.replace(
    "// [[ASSETS_LIST]]",
    `ASSETS_TO_CACHE = ${JSON.stringify(ASSETS_TO_CACHE, null, 2)}`
  );
  
  // Add fetch handler
  const fetchHandler = generateFetchHandler(serviceWorker, features);
  sw = sw.replace("// [[FETCH_HANDLER]]", fetchHandler);
  
  // Add activate handler
  const activateHandler = generateActivateHandler(features.versionedSw);
  sw = sw.replace("// [[ACTIVATE_HANDLER]]", activateHandler);
  
  // Add install handler
  const installHandler = generateInstallHandler(features);
  sw = sw.replace("// [[INSTALL_HANDLER]]", installHandler);
  
  // Add config header
  const configHeader = generateConfigHeader(config, config);
  sw = configHeader + "\n\n" + sw;
  
  return sw;
}

function generateFetchHandler(swConfig, features) {
  const { defaultStrategy, strategies } = swConfig;
  
  return `
// Enhanced fetch handler with configurable caching strategies
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  
  const strategy = determineCacheStrategy(event.request.url, ${JSON.stringify(strategies || {})}, "${defaultStrategy}");
  
  event.respondWith(handleRequestWithStrategy(event.request, strategy));
});

function determineCacheStrategy(url, customStrategies, defaultStrategy) {
  for (const [pattern, strategy] of Object.entries(customStrategies)) {
    if (url.includes(pattern)) return strategy;
  }
  return defaultStrategy;
}

async function handleRequestWithStrategy(request, strategy) {
  const cache = await caches.open(CACHE_NAME);
  
  switch (strategy) {
    case "cache-first": return cacheFirstStrategy(request, cache);
    case "network-first": return networkFirstStrategy(request, cache);
    case "stale-while-revalidate": return staleWhileRevalidateStrategy(request, cache);
    case "cache-only": return cacheOnlyStrategy(request, cache);
    case "network-only": return networkOnlyStrategy(request, cache);
    default: return cacheFirstStrategy(request, cache);
  }
}

async function cacheFirstStrategy(request, cache) {
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirstStrategy(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidateStrategy(request, cache) {
  const cached = await cache.match(request);
  fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
  });
  return cached || fetch(request);
}

async function cacheOnlyStrategy(request, cache) {
  return cache.match(request) || new Response("Not in cache", { status: 404 });
}

async function networkOnlyStrategy(request, cache) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response("Network error", { status: 503 });
  }
}`;
}

function generateActivateHandler(versionedSw) {
  if (versionedSw) {
    return `
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});`;
  }
  return `
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.resolve());
});`;
}

function generateInstallHandler(features) {
  let code = `
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
}`;
  
  if (features.offlineReads || features.mutationQueue) {
    code += `\n  event.waitUntil(initializeOfflineSupport());`;
  }
  
  return code;
}

function generateConfigHeader(config, fullConfig) {
  return `/**
 * Swoff Service Worker - Auto-Generated
 * 
 * This file was automatically generated from swoff.config.json
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
 * See documentation for more details: https://swoff.netlify.app/docs
 */`;
}

function getDefaultTemplate() {
  return `let CACHE_NAME = "";
let ASSETS_TO_CACHE = [];

// [[INSTALL_HANDLER]]
// [[ACTIVATE_HANDLER]]
// [[FETCH_HANDLER]]

const SWOFF = {
  cache: {
    async get(key) {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(key);
    },
    async put(request, response) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response);
    }
  }
};

if (typeof self !== 'undefined') {
  self.SWOFF = SWOFF;
}`;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generate();
}

export default { generate };