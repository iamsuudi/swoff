/**
 * Swoff Files Generator
 *
 * Generates framework-agnostic pattern files based on swoff.config.json features.
 * All files go into swoff/ directory (or public/ for manifest).
 *
 * CLI Usage:
 *   node swoff-files-generator.js --project-root <path> --package-dir <path> --language <ts|js> --config-path <path>
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

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
  database: {
    name: string;
    stores: string[];
  };
  build: {
    outputDir: string;
    swFilename: string;
  };
}

const args = process.argv.slice(2);

function getArg(name: string): string | null {
  const idx = args.findIndex((arg) => arg === `--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const projectRoot = getArg("project-root") || process.cwd();
const packageDir = getArg("package-dir") || join(dirname(fileURLToPath(import.meta.url)), "../..");
const language = getArg("language") || "ts";
const configPath = getArg("config-path") || join(projectRoot, "swoff.config.json");

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
  database: {
    name: "app-db",
    stores: [],
  },
};

let config: SwoffConfig = defaultConfig;

if (existsSync(configPath)) {
  try {
    config = { ...defaultConfig, ...JSON.parse(readFileSync(configPath, "utf8")) };
  } catch {
    console.warn("Could not parse config, using defaults");
  }
} else {
  console.log("No config found, using defaults");
}

const ext = language === "ts" ? "ts" : "js";
const swoffDir = join(projectRoot, "swoff");
const generatedFiles: string[] = [];

function ensureSwoffDir(): void {
  if (!existsSync(swoffDir)) mkdirSync(swoffDir, { recursive: true });
}

function generateSwInjector(): void {
  ensureSwoffDir();

  const autoRegister = config.serviceWorker.autoRegister;
  const autoUpdate = config.serviceWorker.autoUpdate;

  const code = `/**
 * Swoff Service Worker Injector
 * Framework-agnostic client registration with version checking.
 *
 * Usage:
 *   import { initServiceWorker, shouldRegisterSW } from './swoff/sw-injector.js';
 *
 *   // Call in your app entry point (e.g., main.tsx, app.js):
 *   if (shouldRegisterSW()) {
 *     initServiceWorker();
 *   }
 *
 *   // Or defer until after onboarding:
 *   function myShouldRegister() {
 *     return localStorage.getItem('onboarding-complete') === 'true';
 *   }
 *   if (myShouldRegister()) {
 *     initServiceWorker();
 *   }
 *
 * Window events:
 *   sw-version-detected  - Version info available on window
 *   sw-update-available  - New version ready for user consent (detail: { version })
 *   sw-progress          - Download progress (detail: { percent, downloaded, total })
 *   sw-ready             - SW active and controlling page
 *   sw-error             - SW registration failed
 *
 * Window properties:
 *   window.latestSWVersion       - Latest version from version.json
 *   window.currentSWVersion      - Active SW version
 *   window.swAvailableVersion    - Pending update version
 *   window.swUpdateRequired      - Forced update needed (version < minSupportedVersion)
 *   window.swMinSupportedVersion - Minimum supported version from version.json
 *   window.swReady               - SW is active
 *   window.swError               - Registration failed
 */

const AUTO_REGISTER = ${autoRegister};
const AUTO_UPDATE = ${autoUpdate};

async function checkForUpdate() {
  const response = await fetch("/version.json");
  if (!response.ok) {
    throw new Error("Failed to fetch version.json");
  }
  return response.json();
}

async function doRegisterServiceWorker(version) {
  const swUrl = \`/sw-v\${version}.js\`;
  const registration = await navigator.serviceWorker.register(swUrl);
  localStorage.setItem("swRegisteredVersion", version);
  window.currentSWVersion = version;
  window.swRegisteredVersion = version;
  window.dispatchEvent(new CustomEvent("sw-version-detected"));
  window.dispatchEvent(new CustomEvent("sw-ready"));
  return registration;
}

export function shouldRegisterSW() {
  if (!AUTO_REGISTER) return false;

  // Add custom conditions here. Return false to prevent registration.
  // Examples:
  //   - Check if user completed onboarding
  //   - Check if user accepted terms
  //   - Check if user is on a slow connection
  //
  // if (!localStorage.getItem("onboarding-complete")) return false;
  // if (navigator.connection?.effectiveType === "slow-2g") return false;

  return true;
}

export async function initServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return;
  }

  try {
    const manifest = await checkForUpdate();
    const currentVersion = localStorage.getItem("swRegisteredVersion");
    window.latestSWVersion = manifest.version;
    window.swMinSupportedVersion = manifest.minSupportedVersion || "0.0.0";

    if (currentVersion === manifest.version) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.active) {
        window.currentSWVersion = currentVersion;
        window.dispatchEvent(new CustomEvent("sw-version-detected"));
        window.dispatchEvent(new CustomEvent("sw-ready"));
      }
    } else if (currentVersion && currentVersion !== manifest.version) {
      window.swAvailableVersion = manifest.version;
      window.swUpdateRequired =
        currentVersion < (manifest.minSupportedVersion || "0.0.0");

      if (AUTO_UPDATE) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        } else {
          await doRegisterServiceWorker(manifest.version);
        }
      } else {
        window.dispatchEvent(
          new CustomEvent("sw-update-available", {
            detail: { version: manifest.version },
          })
        );
      }
    } else {
      await doRegisterServiceWorker(manifest.version);
    }
  } catch (error) {
    console.error("Service Worker initialization failed:", error);
    window.swError = true;
    window.dispatchEvent(new CustomEvent("sw-error"));
  }
}

export function handleUpdateApproved(newVersion) {
  return navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      registration.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    } else {
      return doRegisterServiceWorker(newVersion).then(() => {
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      });
    }
  });
}

export function skipWaiting() {
  return navigator.serviceWorker.ready.then((registration) => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  });
}

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data.type === "SW_PROGRESS") {
      const { percent, downloaded, total } = event.data;
      window.dispatchEvent(
        new CustomEvent("sw-progress", {
          detail: { percent, downloaded, total },
        })
      );
    }
    if (event.data.type === "BACKGROUND_SYNC_COMPLETE") {
      const { succeeded, failed, tags } = event.data.detail;
      window.dispatchEvent(
        new CustomEvent("mutation-sync-complete", {
          detail: { succeeded, failed },
        })
      );
      if (tags && tags.length > 0) {
        window.dispatchEvent(
          new CustomEvent("cache-invalidated", { detail: { tags } })
        );
      }
      window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
    }
  });
}
`;

  writeFileSync(join(swoffDir, `sw-injector.${ext}`), code);
  generatedFiles.push(`swoff/sw-injector.${ext}`);
}

function generateFetchWrapper(): void {
  ensureSwoffDir();

  const code = `/**
 * Swoff Fetch Wrapper
 * Framework-agnostic fetch with cache strategy, tags, and query deduplication.
 *
 * Usage:
 *   import { fetchWithCache } from './swoff/fetch-wrapper.js';
 *
 *   // GET - cached with tag
 *   const todos = await fetchWithCache("/api/todos", { tags: ["todos"] }).then(r => r.json());
 *
 *   // POST - mutation (passes through to server)
 *   await fetchWithCache("/api/todos", {
 *     method: "POST",
 *     body: JSON.stringify({ title: "New task" }),
 *   });
 *
 *   // Stale-while-revalidate
 *   const data = await fetchWithCache("/api/data", {
 *     tags: ["data"],
 *     staleWhileRevalidate: true,
 *   }).then(r => r.json());
 */

const inFlightRequests = new Map();

export async function fetchWithCache(input, options = {}) {
  const headers = new Headers(options.headers);
  const method = options.method || "GET";

  if (!headers.has("X-SW-Cache-Strategy")) {
    headers.set(
      "X-SW-Cache-Strategy",
      method === "GET" || method === "HEAD" ? "read" : "mutation"
    );
  }

  if (options.staleWhileRevalidate) {
    headers.set("X-SW-Stale", "true");
  }

  if (options.tags && options.tags.length > 0) {
    headers.set("X-SW-Cache-Tags", options.tags.join(","));
  }

  if (method === "GET" || method === "HEAD") {
    const url = typeof input === "string" ? input : input.url;
    if (inFlightRequests.has(url)) {
      return inFlightRequests.get(url).then((r) => r.clone());
    }
    const promise = fetch(input, { ...options, headers }).finally(() => {
      inFlightRequests.delete(url);
    });
    inFlightRequests.set(url, promise);
    return promise;
  }

  return fetch(input, { ...options, headers });
}

export async function fetchWithCacheOrQueue(input, options = {}) {
  if (!navigator.onLine) {
    if (options.method === "GET" || options.method === "HEAD") {
      const cached = await caches.match(input);
      if (cached) return cached;
      throw new Error("Offline: no cached data");
    } else {
      throw new Error("Offline: mutation queued");
    }
  }
  return fetchWithCache(input, options);
}
`;

  writeFileSync(join(swoffDir, "fetch-wrapper.js"), code);
  generatedFiles.push("swoff/fetch-wrapper.js");
}

function generateCache(): void {
  ensureSwoffDir();

  const code = `/**
 * Swoff Cache Invalidation & Cross-Tab Sync
 * Framework-agnostic cache tag invalidation and cross-tab synchronization.
 *
 * Usage:
 *   import { invalidateByTag, initCrossTabSync } from './swoff/cache.js';
 *
 *   // Call once during app init
 *   initCrossTabSync();
 *
 *   // After a mutation, invalidate related cache
 *   await invalidateByTag("todos");
 */

export async function invalidateByTag(tag) {
  if (!navigator.serviceWorker?.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: "INVALIDATE_TAG",
    tag,
  });

  window.dispatchEvent(
    new CustomEvent("cache-invalidated", { detail: { tags: [tag] } })
  );
}

export async function invalidateByTags(tags) {
  for (const tag of tags) {
    await invalidateByTag(tag);
  }
}

export function initCrossTabSync() {
  if (!navigator.serviceWorker) return;

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data.type === "TAG_INVALIDATED" && event.data.tag) {
      window.dispatchEvent(
        new CustomEvent("cache-invalidated", {
          detail: { tags: [event.data.tag] },
        })
      );
    }
  });
}
`;

  writeFileSync(join(swoffDir, "cache.js"), code);
  generatedFiles.push("swoff/cache.js");
}

function generateMutationQueue(): void {
  ensureSwoffDir();

  const code = `/**
 * Swoff Mutation Queue
 * Queue offline writes and sync when connection returns.
 *
 * Usage:
 *   import { queueMutation, processMutationQueue, getPendingCount } from './swoff/mutation-queue.js';
 *
 *   // Queue a mutation
 *   await queueMutation({
 *     method: "POST",
 *     url: "/api/todos",
 *     body: { title: "Grocery" },
 *     tags: ["todos"],
 *     storeName: "todos",
 *     tempId: "temp_abc123",
 *   });
 *
 *   // Auto-processes on online event
 */

const DB_NAME = "swoff-queue";
const STORE_NAME = "mutations";
const MAX_RETRIES = 5;

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by-timestamp", "timestamp");
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

let isSyncing = false;

export async function queueMutation(mutation) {
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  store.add({
    id: crypto.randomUUID(),
    method: mutation.method,
    url: mutation.url,
    body: mutation.body,
    headers: mutation.headers || {},
    previousData: mutation.previousData || null,
    timestamp: Date.now(),
    retryCount: 0,
    tags: mutation.tags || [],
    storeName: mutation.storeName || null,
    tempId: mutation.tempId || null,
  });

  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
}

export async function processMutationQueue() {
  if (!navigator.onLine || isSyncing) return;
  isSyncing = true;

  try {
    const db = await openQueueDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("by-timestamp");
    const queue = await new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    let succeeded = 0;
    let failed = 0;

    for (const item of queue) {
      if (item.retryCount >= MAX_RETRIES) {
        await rollbackMutation(item);
        await removeFromQueue(item.id);
        failed++;
        continue;
      }

      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            "Content-Type": "application/json",
            ...item.headers,
          },
          body: JSON.stringify(item.body),
        });

        if (!response.ok) throw new Error(\`HTTP \${response.status}\`);

        const serverData = await response.json();

        if (item.tempId && item.storeName) {
          await reconcileRecord(item.storeName, item.tempId, serverData);
        }

        if (item.tags && item.tags.length > 0) {
          const { invalidateByTags } = await import("./cache.js");
          await invalidateByTags(item.tags);
        }

        await removeFromQueue(item.id);
        succeeded++;
      } catch {
        item.retryCount++;
        await updateInQueue(item);
        failed++;
      }
    }

    window.dispatchEvent(
      new CustomEvent("mutation-sync-complete", {
        detail: { succeeded, failed },
      })
    );
  } finally {
    isSyncing = false;
    window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
  }
}

async function removeFromQueue(id) {
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateInQueue(item) {
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(item);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function rollbackMutation(item) {
  if (!item.storeName) return;

  if (item.method === "POST" && item.tempId) {
    const { deleteRecord } = await import("./store.js");
    await deleteRecord(item.storeName, item.tempId);
  } else if (
    (item.method === "PUT" || item.method === "PATCH") &&
    item.previousData
  ) {
    const { putRecord } = await import("./store.js");
    await putRecord(item.storeName, { ...item.previousData, $synced: true });
  } else if (item.method === "DELETE" && item.tempId && item.previousData) {
    const { putRecord } = await import("./store.js");
    await putRecord(item.storeName, { ...item.previousData, $synced: true });
  }

  window.dispatchEvent(
    new CustomEvent("mutation-rollback", {
      detail: {
        method: item.method,
        url: item.url,
        tempId: item.tempId,
        previousData: item.previousData,
      },
    })
  );
}

async function reconcileRecord(storeName, tempId, serverData) {
  const { getRecord, putRecord, deleteRecord } = await import("./store.js");
  const existing = await getRecord(storeName, tempId);
  if (!existing) return;

  const reconciled = {
    ...existing,
    ...serverData,
    id: serverData.id,
    $synced: true,
    $syncedAt: Date.now(),
  };

  await putRecord(storeName, reconciled);

  if (String(tempId) !== String(serverData.id)) {
    await deleteRecord(storeName, tempId);
  }
}

export async function getPendingCount() {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

window.addEventListener("online", processMutationQueue);
`;

  writeFileSync(join(swoffDir, "mutation-queue.js"), code);
  generatedFiles.push("swoff/mutation-queue.js");
}

function generateBackgroundSync(): void {
  ensureSwoffDir();

  const code = `/**
 * Swoff Background Sync
 * Register sync events for processing mutation queue after tab close.
 * Falls back to online event listener in unsupported browsers.
 *
 * Usage:
 *   import { syncWhenPossible } from './swoff/background-sync.js';
 *
 *   await syncWhenPossible({
 *     method: "POST",
 *     url: "/api/todos",
 *     body: { title: "Grocery" },
 *     tags: ["todos"],
 *     storeName: "todos",
 *     tempId: "temp_abc123",
 *   });
 */

import { queueMutation, processMutationQueue, getPendingCount } from "./mutation-queue.js";

const SYNC_TAG = "sync-mutations";

async function registerSync() {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) {
    window.addEventListener("online", processMutationQueue, { once: true });
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(SYNC_TAG);
  } catch {
    window.addEventListener("online", processMutationQueue, { once: true });
  }
}

export async function syncWhenPossible(mutation) {
  await queueMutation(mutation);
  await registerSync();
}

export async function retrySync() {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return;
  const count = await getPendingCount();
  if (count > 0) {
    await registerSync();
  }
}

window.addEventListener("mutation-sync-complete", retrySync);
`;

  writeFileSync(join(swoffDir, "background-sync.js"), code);
  generatedFiles.push("swoff/background-sync.js");
}

function generateSwGeneratorBuildScript(): void {
  ensureSwoffDir();

  const code = `#!/usr/bin/env node
/**
 * Swoff SW Generator Build Script
 * Reads swoff/sw-template.js and generates versioned SW output.
 *
 * Add to package.json:
 *   "build": "your-build && node swoff/sw-generator.js"
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const pkgPath = join(projectRoot, 'package.json');
const templatePath = join(__dirname, 'sw-template.js');
const configPath = join(projectRoot, 'swoff.config.json');

if (!existsSync(configPath)) {
  console.error('Error: swoff.config.json not found');
  console.log('Run "npx @swoff/cli init" to create one');
  process.exit(1);
}

if (!existsSync(templatePath)) {
  console.error('Error: swoff/sw-template.js not found');
  process.exit(1);
}

const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : { version: '1.0.0' };
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const template = readFileSync(templatePath, 'utf8');

const version = config.version === 'from-package' ? pkg.version || '1.0.0' : config.version;
const outputDir = config.build?.outputDir || 'dist';
const swFilename = config.build?.swFilename || 'sw';

let sw = template;
sw = sw.replace('// [[CACHE_NAME]]', \`CACHE_NAME = 'sw-v\${version}'\`);

const baseAssets = ['/', '/index.html'];
const pwaAssets = config.features?.pwa ? ['/manifest.json'] : [];
const assetsToCache = [...baseAssets, ...pwaAssets];
sw = sw.replace('// [[ASSETS_LIST]]', \`ASSETS_TO_CACHE = \${JSON.stringify(assetsToCache.map(url => ({ url, options: {} })), null, 2)}\`);
sw = sw.replace('// [[AUTO_SKIP_WAITING]]', \`const AUTO_SKIP_WAITING = \${config.serviceWorker?.autoUpdate || false};\`);

const outDir = join(projectRoot, outputDir);
if (!existsSync(outDir)) {
  import('fs').then(fs => fs.mkdirSync(outDir, { recursive: true }));
}

writeFileSync(join(projectRoot, outputDir, \`\${swFilename}-v\${version}.js\`), sw);
writeFileSync(join(projectRoot, outputDir, 'version.json'), JSON.stringify({
  version,
  minSupportedVersion: config.minSupportedVersion || '0.0.0',
  generatedAt: new Date().toISOString(),
}, null, 2));

console.log(\`Service worker built: \${outputDir}/\${swFilename}-v\${version}.js\`);
`;

  writeFileSync(join(swoffDir, "sw-generator.js"), code);
  generatedFiles.push("swoff/sw-generator.js");
}

function generateSwTemplate(): void {
  ensureSwoffDir();

  const code = `/**
 * Swoff Service Worker Template
 *
 * This file is processed by swoff/sw-generator.js to create
 * a versioned service worker. Placeholders are replaced during build.
 *
 * Placeholders:
 *   // [[CACHE_NAME]]       - Replaced with versioned cache name
 *   // [[ASSETS_LIST]]      - Replaced with assets to cache
 *   // [[AUTO_SKIP_WAITING]] - Replaced with autoUpdate config
 *
 * You can customize this template before running the build script.
 */

let CACHE_NAME = "";
let ASSETS_TO_CACHE = [];

// [[CACHE_NAME]]
// [[ASSETS_LIST]]
// [[AUTO_SKIP_WAITING]]

const CACHE_NAME_RUNTIME = "swoff-runtime";

// Install - download assets with progress tracking
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
});

// Activate - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== CACHE_NAME_RUNTIME).map((key) => caches.delete(key))
      )
    )
  );
});

// Message - skip waiting and cache invalidation
self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch - cache strategies
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" && event.request.method !== "HEAD") return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
      const url = new URL(event.request.url);

      const byPath = await cache.match(url.pathname);
      if (byPath) return byPath;

      const byRequest = await runtimeCache.match(event.request);
      if (byRequest) return byRequest;

      if (event.request.mode === "navigate") {
        const spa = await cache.match("/index.html");
        if (spa) return spa;
      }

      try {
        const response = await fetch(event.request);
        if (response.ok) {
          await runtimeCache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return new Response("Offline: content not available", { status: 503 });
      }
    })(),
  );
});

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
  }
};

if (typeof self !== 'undefined') {
  self.SWOFF = SWOFF;
}
`;

  writeFileSync(join(swoffDir, "sw-template.js"), code);
  generatedFiles.push("swoff/sw-template.js");
}

function generateStore(): void {
  ensureSwoffDir();

  const dbName = config.database?.name || "app-db";

  const code = `/**
 * Swoff IndexedDB Store
 * Generic CRUD operations for app's IndexedDB database.
 *
 * Usage:
 *   import { getRecord, putRecord, deleteRecord, openAppDB } from './swoff/store.js';
 *
 *   const record = await getRecord('todos', 'todo-123');
 *   await putRecord('todos', { id: 'todo-123', title: 'New task', $synced: false });
 *   await deleteRecord('todos', 'todo-123');
 */

const DB_NAME = "${dbName}";

export function openAppDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function getRecord(storeName, id) {
  const db = await openAppDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putRecord(storeName, record) {
  const db = await openAppDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.put(record);
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteRecord(storeName, id) {
  const db = await openAppDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllRecords(storeName) {
  const db = await openAppDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
`;

  writeFileSync(join(swoffDir, "store.js"), code);
  generatedFiles.push("swoff/store.js");
}

function generateReconcile(): void {
  ensureSwoffDir();

  const code = `/**
 * Swoff ID Reconciliation
 * Update local records with server data after mutation sync.
 *
 * Usage:
 *   import { reconcileRecord } from './swoff/reconcile.js';
 *
 *   await reconcileRecord('todos', 'temp_abc123', serverData);
 */

import { getRecord, putRecord, deleteRecord } from './store.js';

export async function reconcileRecord(storeName, tempId, serverData) {
  const existing = await getRecord(storeName, tempId);
  if (!existing) return;

  const reconciled = {
    ...existing,
    ...serverData,
    id: serverData.id,
    $synced: true,
    $syncedAt: Date.now(),
  };

  await putRecord(storeName, reconciled);

  if (String(tempId) !== String(serverData.id)) {
    await deleteRecord(storeName, tempId);
  }

  await reconcileReferences(storeName, tempId, serverData.id);
}

export async function reconcileReferences(storeName, oldId, newId) {
  // Override this for your app's schema.
  // Example: update foreign-key references in related stores.
  //
  // const txns = await getAllRecords('transactions');
  // for (const txn of txns) {
  //   if (txn.todoId === oldId) {
  //     txn.todoId = newId;
  //     await putRecord('transactions', txn);
  //   }
  // }
}
`;

  writeFileSync(join(swoffDir, "reconcile.js"), code);
  generatedFiles.push("swoff/reconcile.js");
}

function generateIndexedDB(): void {
  ensureSwoffDir();

  const dbName = config.database?.name || "app-db";
  const stores = config.database?.stores || [];

  const code = `/**
 * Swoff IndexedDB Setup
 * Database initialization with schema migrations.
 *
 * Usage:
 *   import { openDB } from './swoff/indexeddb.js';
 *
 *   const db = await openDB();
 */

const DB_NAME = "${dbName}";
const DB_VERSION = 1;

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      const oldVersion = e.oldVersion;

${stores.length > 0 ? stores.map((store: string, i: number) => `      if (oldVersion < ${i + 1}) {
        db.createObjectStore("${store}", { keyPath: "id" });
      }`).join("\n\n") : `      // Create your object stores here:
      // if (oldVersion < 1) {
      //   const todos = db.createObjectStore("todos", { keyPath: "id" });
      //   todos.createIndex("by-date", "date");
      // }`}
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;

  const isPersisted = await navigator.storage.persisted();
  if (isPersisted) return true;

  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function monitorStorage() {
  const estimate = await navigator.storage.estimate();
  const ratio = estimate.usage / estimate.quota;

  return {
    usage: estimate.usage,
    quota: estimate.quota,
    ratio,
    status: ratio >= 0.95 ? "critical" : ratio >= 0.8 ? "warning" : "ok",
  };
}
`;

  writeFileSync(join(swoffDir, "indexeddb.js"), code);
  generatedFiles.push("swoff/indexeddb.js");
}

function generateTypeDefinitions(): void {
  if (language !== "ts") return;
  ensureSwoffDir();

  const code = `interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    deferredInstallPrompt: BeforeInstallPromptEvent | null;
    latestSWVersion?: string;
    currentSWVersion?: string;
    swRegisteredVersion?: string;
    swAvailableVersion?: string;
    swUpdateRequired?: boolean;
    swMinSupportedVersion?: string;
    swReady?: boolean;
    swError?: boolean;
  }
}

export interface SWOFFCache {
  get(key: Request | string): Promise<Response | undefined>;
  put(request: Request | string, response: Response): Promise<void>;
  delete(request: Request | string): Promise<boolean>;
}

export interface SWOFF {
  cache: SWOFFCache;
  network: {
    fetch(request: Request | string, options?: RequestInit): Promise<Response>;
  };
}

export interface FetchWithCacheOptions extends RequestInit {
  strategy?: "read" | "mutation";
  tags?: string[];
  staleWhileRevalidate?: boolean;
}

export interface MutationQueueItem {
  id: string;
  method: string;
  url: string;
  body: unknown;
  headers: Record<string, string>;
  previousData: unknown | null;
  timestamp: number;
  retryCount: number;
  tags: string[];
  storeName: string | null;
  tempId: string | null;
}

export interface MutationQueueResult {
  succeeded: number;
  failed: number;
}

export {};
`;

  writeFileSync(join(swoffDir, "swoff.d.ts"), code);
  generatedFiles.push("swoff/swoff.d.ts");
}

function generateManifest(): void {
  const outputDir = join(projectRoot, "public");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const manifest = {
    name: "Swoff App",
    short_name: "Swoff",
    description: "Offline-first web application",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };

  writeFileSync(join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  generatedFiles.push("public/manifest.json");
}

console.log("Generating Swoff files...");
console.log(`Language: ${language}`);
console.log(`Project: ${projectRoot}`);
console.log("");

if (!config.enabled) {
  console.log("Config generation disabled");
  process.exit(0);
}

console.log("Generating pattern files...");

generateSwTemplate();
console.log("  sw-template");

if (config.features.clientRegistration) {
  generateSwInjector();
  console.log("  sw-injector");
}

generateFetchWrapper();
console.log("  fetch-wrapper");

if (config.features.tagInvalidation || config.features.crossTabSync) {
  generateCache();
  console.log("  cache");
}

if (config.features.mutationQueue) {
  generateStore();
  console.log("  store");
  generateReconcile();
  console.log("  reconcile");
  generateMutationQueue();
  console.log("  mutation-queue");
}

if (config.features.backgroundSync) {
  generateBackgroundSync();
  console.log("  background-sync");
}

if (config.features.indexeddb) {
  generateIndexedDB();
  console.log("  indexeddb");
}

generateSwGeneratorBuildScript();
console.log("  sw-generator");

generateTypeDefinitions();
console.log("  swoff.d.ts");

if (config.features.pwa) {
  generateManifest();
  console.log("  manifest.json");
}

console.log("\nGenerated files:");
generatedFiles.forEach((file) => console.log(`  ${file}`));
console.log(`\nTotal: ${generatedFiles.length} files`);
