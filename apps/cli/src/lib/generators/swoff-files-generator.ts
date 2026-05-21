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

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const SWOFF_CONFIG = 'swoff.config.json';

if (!existsSync(join(projectRoot, SWOFF_CONFIG))) {
  console.error('Error: swoff.config.json not found');
  console.log('Run "npx @swoff/cli init" to create one');
  process.exit(1);
}

console.log('Building service worker...');

const proc = spawn(
  'npx',
  ['@swoff/cli', 'generate', '--sw-only'],
  { stdio: 'inherit', shell: true, cwd: projectRoot }
);

proc.on('close', (code) => {
  if (code === 0) {
    console.log('Service worker build complete');
  } else {
    console.error('Build failed');
    process.exit(code || 1);
  }
});
`;

  writeFileSync(join(swoffDir, "sw-generator.js"), code);
  generatedFiles.push("swoff/sw-generator.js");
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
  generateMutationQueue();
  console.log("  mutation-queue");
}

if (config.features.backgroundSync) {
  generateBackgroundSync();
  console.log("  background-sync");
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
