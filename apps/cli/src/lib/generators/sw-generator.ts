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

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

interface GeneratorOptions {
  projectRoot?: string;
  packageDir?: string;
}

interface SwoffConfig {
  enabled: boolean;
  version: string;
  minSupportedVersion: string;
  serviceWorker: {
    autoUpdate: boolean;
    defaultStrategy: string;
    strategies: Record<string, string>;
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
  };
  build: {
    outputDir: string;
    swFilename: string;
  };
}

const args = process.argv.slice(2);
const projectRootArg = args.findIndex((arg) => arg === "--project-root");
const packageDirArg = args.findIndex((arg) => arg === "--package-dir");

const passedProjectRoot = projectRootArg !== -1 ? args[projectRootArg + 1] : null;
const passedPackageDir = packageDirArg !== -1 ? args[packageDirArg + 1] : null;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = passedPackageDir || join(scriptDir, "..");
const projectRoot = passedProjectRoot || process.cwd();

const defaultConfig: SwoffConfig = {
  enabled: true,
  version: "from-package",
  minSupportedVersion: "0.0.0",
  serviceWorker: {
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
  },
  build: {
    outputDir: "dist",
    swFilename: "sw",
  },
};

export async function generate(options: GeneratorOptions = {}): Promise<void> {
  const optProjectRoot = options.projectRoot || projectRoot;
  const optPackageDir = options.packageDir || packageDir;

  const pkgPath = join(optProjectRoot, "package.json");
  let pkg = { version: "1.0.0" };

  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    } catch {
      console.warn("Could not read package.json, using default version");
    }
  }

  const templatePath = join(optPackageDir, "src/lib/templates/sw-template.js");
  let template: string;

  if (existsSync(templatePath)) {
    template = readFileSync(templatePath, "utf8");
  } else {
    template = getDefaultTemplate();
  }

  let userConfig: Partial<SwoffConfig> = {};
  let configSource = "defaults";

  const configPath = join(optProjectRoot, "swoff.config.json");

  if (existsSync(configPath)) {
    try {
      userConfig = JSON.parse(readFileSync(configPath, "utf8"));
      configSource = "JSON";
    } catch {
      console.warn("Could not parse swoff.config.json, using defaults");
    }
  } else {
    const jsConfigPath = join(optProjectRoot, "swoff.config.js");
    if (existsSync(jsConfigPath)) {
      try {
        const mod = await import(jsConfigPath);
        userConfig = (mod.default || mod) as Partial<SwoffConfig>;
        configSource = "JavaScript";
      } catch {
        console.warn("Could not load swoff.config.js, using defaults");
      }
    }
  }

  const config: SwoffConfig = { ...defaultConfig, ...userConfig };

  if (!config.enabled) {
    console.log("Swoff config generation disabled. Using custom code mode.");
    return;
  }

  const version = config.version === "from-package" ? pkg.version || "1.0.0" : config.version;

  const sw = generateServiceWorker(config, version);

  const outputDir = join(optProjectRoot, config.build.outputDir);
  const swFilename = config.build.swFilename;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  try {
    writeFileSync(join(outputDir, `${swFilename}-v${version}.js`), sw);
    writeFileSync(
      join(outputDir, "version.json"),
      JSON.stringify(
        {
          version: version,
          minSupportedVersion: config.minSupportedVersion,
          generatedAt: new Date().toISOString(),
          configEnabled: config.enabled,
          configSource: configSource,
        },
        null,
        2,
      ),
    );

    console.log(`✅ Swoff service worker generated successfully!`);
    console.log(`📁 Output: ${outputDir}/${swFilename}-v${version}.js`);
    console.log(`📄 Version info: ${outputDir}/version.json`);
    console.log(`ℹ️  Configuration source: ${configSource}`);
  } catch (err) {
    console.error(`Error writing files: ${err instanceof Error ? err.message : String(err)}`);
    console.log("Make sure the output directory exists:");
    console.log(`  mkdir -p ${outputDir}`);
  }
}

function generateServiceWorker(config: SwoffConfig, version: string): string {
  const { serviceWorker, features } = config;

  const baseAssets = ["/", "/index.html"];
  const pwaAssets = features.pwa ? ["/manifest.json"] : [];
  const assetsToCache = [...baseAssets, ...pwaAssets];

  let sw = getDefaultTemplate();

  sw = sw.replace("// [[CACHE_NAME]]", `CACHE_NAME = 'sw-v${version}'`);
  sw = sw.replace("// [[ASSETS_LIST]]", `ASSETS_TO_CACHE = ${JSON.stringify(assetsToCache, null, 2)}`);

  sw = sw.replace("// [[FETCH_HANDLER]]", generateFetchHandler(serviceWorker, features));
  sw = sw.replace("// [[ACTIVATE_HANDLER]]", generateActivateHandler(features.versionedSw));
  sw = sw.replace("// [[INSTALL_HANDLER]]", generateInstallHandler(features));
  sw = `// [[CONFIG_HEADER]]\n\n${sw}`;
  sw = sw.replace(
    "// [[CONFIG_HEADER]]",
    generateConfigHeader(config),
  );

  return sw;
}

function generateFetchHandler(
  swConfig: { defaultStrategy: string; strategies: Record<string, string> },
  features: SwoffConfig["features"],
): string {
  const { defaultStrategy, strategies } = swConfig;

  return `
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
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirstStrategy(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidateStrategy(request, cache) {
  const cached = await cache.match(request);
  fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
  });
  return cached || fetch(request);
}

async function cacheOnlyStrategy(request, cache) {
  return (await cache.match(request)) || new Response("Not in cache", { status: 404 });
}

async function networkOnlyStrategy(request, _cache) {
  try {
    return await fetch(request);
  } catch {
    return new Response("Network error", { status: 503 });
  }
}`;
}

function generateActivateHandler(versionedSw: boolean): string {
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

function generateInstallHandler(features: SwoffConfig["features"]): string {
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

function generateConfigHeader(config: SwoffConfig): string {
  return `/**
 * Swoff Service Worker - Auto-Generated
 * Generated from swoff.config.json
 * DO NOT EDIT MANUALLY
 * Version: ${config.version}
 * Features: versionedSw=${config.features.versionedSw}, offlineReads=${config.features.offlineReads}, mutationQueue=${config.features.mutationQueue}
 * Default Strategy: ${config.serviceWorker.defaultStrategy}
 * See: https://swoff.netlify.app/docs
 */`;
}

function getDefaultTemplate(): string {
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

if (import.meta.url === `file://${process.argv[1]}`) {
  generate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export default { generate };