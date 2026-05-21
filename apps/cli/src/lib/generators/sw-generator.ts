/**
 * Swoff Service Worker Generator
 *
 * Generates a service worker based on swoff.config.json configuration.
 * Can be run as CLI or imported as a module.
 *
 * CLI Usage:
 *   node sw-generator.js [--project-root <path>] [--package-dir <path>] [--config-path <path>]
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
  configPath?: string;
}

interface SwoffConfig {
  enabled: boolean;
  version: string;
  minSupportedVersion: string;
  serviceWorker: {
    autoRegister: boolean;
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
    clientRegistration: boolean;
    indexeddb: boolean;
  };
  build: {
    outputDir: string;
    swFilename: string;
  };
}

const args = process.argv.slice(2);
const projectRootArg = args.findIndex((arg) => arg === "--project-root");
const packageDirArg = args.findIndex((arg) => arg === "--package-dir");
const configPathArg = args.findIndex((arg) => arg === "--config-path");

const passedProjectRoot = projectRootArg !== -1 ? args[projectRootArg + 1] : null;
const passedPackageDir = packageDirArg !== -1 ? args[packageDirArg + 1] : null;
const passedConfigPath = configPathArg !== -1 ? args[configPathArg + 1] : null;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = passedPackageDir || join(scriptDir, "..");
const projectRoot = passedProjectRoot || process.cwd();

const defaultConfig: SwoffConfig = {
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
  build: {
    outputDir: "dist",
    swFilename: "sw",
  },
};

export async function generate(options: GeneratorOptions = {}): Promise<void> {
  const optProjectRoot = options.projectRoot || projectRoot;
  const optPackageDir = options.packageDir || packageDir;
  const optConfigPath = options.configPath || passedConfigPath;

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

  const resolvedConfigPath = optConfigPath || join(optProjectRoot, "swoff.config.json");

  if (existsSync(resolvedConfigPath)) {
    try {
      userConfig = JSON.parse(readFileSync(resolvedConfigPath, "utf8"));
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

    console.log(`Service worker generated successfully.`);
    console.log(`Output: ${outputDir}/${swFilename}-v${version}.js`);
    console.log(`Version info: ${outputDir}/version.json`);
    console.log(`Configuration source: ${configSource}`);
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
  sw = sw.replace("// [[ASSETS_LIST]]", `ASSETS_TO_CACHE = ${JSON.stringify(assetsToCache.map((url) => ({ url, options: {} })), null, 2)}`);
  sw = sw.replace("// [[AUTO_SKIP_WAITING]]", `const AUTO_SKIP_WAITING = ${config.serviceWorker.autoUpdate};`);

  sw = sw.replace("// [[FETCH_HANDLER]]", generateFetchHandler(serviceWorker, features));
  sw = sw.replace("// [[ACTIVATE_HANDLER]]", generateActivateHandler(features.versionedSw));
  sw = sw.replace("// [[INSTALL_HANDLER]]", generateInstallHandler(features));
  sw = sw.replace("// [[MESSAGE_HANDLER]]", generateMessageHandler(features));

  if (features.tagInvalidation) {
    sw = sw.replace("// [[TAG_MANAGEMENT]]", generateTagManagement());
  } else {
    sw = sw.replace("// [[TAG_MANAGEMENT]]", "");
  }

  sw = `// [[CONFIG_HEADER]]\n\n${sw}`;
  sw = sw.replace(
    "// [[CONFIG_HEADER]]",
    generateConfigHeader(config),
  );

  if (features.backgroundSync) {
    sw += `\n\n${generateBackgroundSyncHandler()}`;
  }

  return sw;
}

function generateFetchHandler(
  swConfig: { defaultStrategy: string; strategies: Record<string, string> },
  features: SwoffConfig["features"],
): string {
  const { defaultStrategy, strategies } = swConfig;

  const tagInvalidationCode = features.tagInvalidation ? `
        const tagsHeader = event.request.headers.get("X-SW-Cache-Tags");
        if (tagsHeader) {
          const url = new URL(event.request.url).href;
          const tags = tagsHeader.split(",").map((t) => t.trim());
          await cacheTagUrl(url, tags);
        }` : "";

  const staleTagCode = features.tagInvalidation ? `
        const tagsHeader = request.headers.get("X-SW-Cache-Tags");
        if (tagsHeader) {
          const url = new URL(request.url).href;
          const tags = tagsHeader.split(",").map((t) => t.trim());
          await cacheTagUrl(url, tags);
        }` : "";

  return `
function isReadRequest(request) {
  const strategy = request.headers.get("X-SW-Cache-Strategy");
  if (strategy === "read") return true;
  if (strategy === "mutation") return false;
  return request.method === "GET" || request.method === "HEAD";
}

function determineCacheStrategy(request, customStrategies, defaultStrategy) {
  const url = request.url;
  for (const [pattern, strategy] of Object.entries(customStrategies)) {
    if (url.includes(pattern.replace("*", ""))) return strategy;
  }
  return defaultStrategy;
}

self.addEventListener("fetch", (event) => {
  if (!isReadRequest(event.request)) return;

  const strategy = determineCacheStrategy(event.request, ${JSON.stringify(strategies)}, "${defaultStrategy}");

  if (strategy === "stale-while-revalidate" || event.request.headers.get("X-SW-Stale") === "true") {
    event.respondWith(staleWhileRevalidate(event, event.request));
    return;
  }

  if (strategy === "network-first") {
    event.respondWith(networkFirst(event, event.request));
    return;
  }

  // cache-first (default)
  event.respondWith(cacheFirst(event, event.request));
});

async function cacheFirst(event, request) {
  const cache = await caches.open(CACHE_NAME);
  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
  const url = new URL(request.url);

  const byPath = await cache.match(url.pathname);
  if (byPath) return byPath;

  const byRequest = await runtimeCache.match(request);
  if (byRequest) return byRequest;

  if (request.mode === "navigate") {
    const spa = await cache.match("/index.html");
    if (spa) return spa;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      event.waitUntil(
        (async () => {
          await runtimeCache.put(request, cloned);${tagInvalidationCode}
        })(),
      );
    }
    return response;
  } catch {
    return new Response("Offline: content not available", { status: 503 });
  }
}

async function networkFirst(event, request) {
  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      event.waitUntil(
        (async () => {
          await runtimeCache.put(request, cloned);${tagInvalidationCode}
        })(),
      );
    }
    return response;
  } catch {
    const cached = await runtimeCache.match(request);
    if (cached) return cached;

    if (request.mode === "navigate") {
      const cache = await caches.open(CACHE_NAME);
      const spa = await cache.match("/index.html");
      if (spa) return spa;
    }

    return new Response("Offline: content not available", { status: 503 });
  }
}

async function staleWhileRevalidate(event, request) {
  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
  const cached = await runtimeCache.match(request);

  if (cached) {
    event.waitUntil(refreshCache(runtimeCache, request));
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      await runtimeCache.put(request, response.clone());${staleTagCode}
    }
    return response;
  } catch {
    return new Response("Offline: content not available", { status: 503 });
  }
}

async function refreshCache(cache, request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
  } catch {
    // Background refresh failed - stale cache remains usable
  }
}`;
}

function generateActivateHandler(versionedSw: boolean): string {
  return `
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== CACHE_NAME_RUNTIME).map((key) => caches.delete(key))
      )
    )
  );
});`;
}

function generateInstallHandler(features: SwoffConfig["features"]): string {
  return `
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      let downloaded = 0;
      for (const asset of ASSETS_TO_CACHE) {
        try {
          const request = new Request(asset.url, asset.options);
          await cache.add(request);
          downloaded++;
          const percent = Math.round((downloaded / ASSETS_TO_CACHE.length) * 100);
          const clients = await self.clients.matchAll({ includeUncontrolled: true });
          clients.forEach((client) => {
            client.postMessage({
              type: "SW_PROGRESS",
              percent,
              downloaded,
              total: ASSETS_TO_CACHE.length,
            });
          });
        } catch (err) {
          console.error(\`Failed to cache \${asset.url}:\`, err);
        }
      }
      if (AUTO_SKIP_WAITING) self.skipWaiting();
    })(),
  );
});`;
}

function generateMessageHandler(features: SwoffConfig["features"]): string {
  let code = `
self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }`;

  if (features.tagInvalidation) {
    code += `
  if (event.data.type === "INVALIDATE_TAG" && event.data.tag) {
    event.waitUntil(invalidateByTag(event.data.tag));
  }`;
  }

  code += `
});`;
  return code;
}

function generateTagManagement(): string {
  return `
const TAG_DB_NAME = "swoff-cache-tags";
const TAG_STORE_NAME = "tags";

function openTagDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(TAG_DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(TAG_STORE_NAME)) {
        const store = db.createObjectStore(TAG_STORE_NAME, { keyPath: "url" });
        store.createIndex("by-tag", "tags", { multiEntry: true });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function cacheTagUrl(url, tags) {
  const db = await openTagDB();
  const tx = db.transaction(TAG_STORE_NAME, "readwrite");
  const store = tx.objectStore(TAG_STORE_NAME);
  store.put({ url, tags });
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function invalidateByTag(tag) {
  const db = await openTagDB();
  const tx = db.transaction(TAG_STORE_NAME, "readonly");
  const store = tx.objectStore(TAG_STORE_NAME);
  const index = store.index("by-tag");
  const entries = await new Promise((resolve, reject) => {
    const request = index.getAll(tag);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await db.close();

  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
  for (const entry of entries) {
    await runtimeCache.delete(entry.url);
  }

  const writeDb = await openTagDB();
  const writeTx = writeDb.transaction(TAG_STORE_NAME, "readwrite");
  const writeStore = writeTx.objectStore(TAG_STORE_NAME);
  for (const entry of entries) {
    writeStore.delete(entry.url);
  }
  await new Promise((resolve, reject) => {
    writeTx.oncomplete = () => resolve();
    writeTx.onerror = () => reject(writeTx.error);
  });

  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "TAG_INVALIDATED", tag });
  });
}`;
}

function generateBackgroundSyncHandler(): string {
  return `
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-mutations") {
    event.waitUntil(processMutationQueueInSW());
  }
});

async function processMutationQueueInSW() {
  const SW_DB_NAME = "swoff-queue";
  const SW_STORE_NAME = "mutations";
  const SW_MAX_RETRIES = 5;

  let succeeded = 0;
  let failed = 0;
  const tagsToInvalidate = new Set();

  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(SW_DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(SW_STORE_NAME)) {
          const store = db.createObjectStore(SW_STORE_NAME, { keyPath: "id" });
          store.createIndex("by-timestamp", "timestamp");
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });

    const tx = db.transaction(SW_STORE_NAME, "readonly");
    const store = tx.objectStore(SW_STORE_NAME);
    const index = store.index("by-timestamp");
    const queue = await new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    for (const item of queue) {
      if (item.retryCount >= SW_MAX_RETRIES) {
        await removeFromSWQueue(db, item.id);
        failed++;
        continue;
      }
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: { "Content-Type": "application/json", ...item.headers },
          body: JSON.stringify(item.body),
        });
        if (!response.ok) throw new Error(\`HTTP \${response.status}\`);

        if (item.tags) {
          item.tags.forEach((tag) => tagsToInvalidate.add(tag));
        }

        await removeFromSWQueue(db, item.id);
        succeeded++;
      } catch {
        item.retryCount++;
        await updateInSWQueue(db, item);
        failed++;
      }
    }
  } catch (err) {
    console.error("Background sync failed:", err);
  }

  for (const tag of tagsToInvalidate) {
    await invalidateByTag(tag);
  }

  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({
      type: "BACKGROUND_SYNC_COMPLETE",
      detail: { succeeded, failed, tags: [...tagsToInvalidate] },
    });
  }
}

async function removeFromSWQueue(db, id) {
  const tx = db.transaction(SW_STORE_NAME, "readwrite");
  tx.objectStore(SW_STORE_NAME).delete(id);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateInSWQueue(db, item) {
  const tx = db.transaction(SW_STORE_NAME, "readwrite");
  tx.objectStore(SW_STORE_NAME).put(item);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}`;
}

function generateConfigHeader(config: SwoffConfig): string {
  return `/**
 * Swoff Service Worker - Auto-Generated
 * Generated from swoff.config.json
 * DO NOT EDIT MANUALLY
 * Version: ${config.version}
 * Features: versionedSw=${config.features.versionedSw}, offlineReads=${config.features.offlineReads}, mutationQueue=${config.features.mutationQueue}, backgroundSync=${config.features.backgroundSync}, tagInvalidation=${config.features.tagInvalidation}
 * Default Strategy: ${config.serviceWorker.defaultStrategy}
 * See: https://swoff.netlify.app/docs
 */`;
}

function getDefaultTemplate(): string {
  return `let CACHE_NAME = "";
let ASSETS_TO_CACHE = [];

// [[CACHE_NAME]]
// [[ASSETS_LIST]]
// [[AUTO_SKIP_WAITING]]

const CACHE_NAME_RUNTIME = "swoff-runtime";

// [[INSTALL_HANDLER]]
// [[ACTIVATE_HANDLER]]
// [[MESSAGE_HANDLER]]
// [[FETCH_HANDLER]]
// [[TAG_MANAGEMENT]]

const SWOFF = {
  cache: {
    async get(key) {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(key);
    },
    async put(request, response) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response);
    },
    async delete(request) {
      const cache = await caches.open(CACHE_NAME);
      return cache.delete(request);
    }
  },
  network: {
    async fetch(request, options = {}) {
      try {
        return await fetch(request, options);
      } catch (error) {
        throw new Error(\`Network request failed: \${error.message}\`);
      }
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
