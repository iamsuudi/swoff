/**
 * Swoff Service Worker - Auto-Generated
 * Generated from swoff.config.json
 * DO NOT EDIT MANUALLY
 * Version: 0.0.0
 * Features: versionedSw=true, mutationQueue=false, backgroundSync=false, tagInvalidation=true
 * Default Strategy: cache-first
 * See: https://swoff.netlify.app/docs
 */

let CACHE_NAME = "";
let ASSETS_TO_CACHE = [];

// [[CACHE_NAME]]
// [[ASSETS_LIST]]
// [[AUTO_SKIP_WAITING]]

const CACHE_NAME_RUNTIME = "swoff-runtime";


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
          console.error(`Failed to cache ${asset.url}:`, err);
        }
      }
      if (AUTO_SKIP_WAITING) self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== CACHE_NAME_RUNTIME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data.type === "INVALIDATE_TAG" && event.data.tag) {
    event.waitUntil(invalidateByTag(event.data.tag));
  }
});

async function fromPrecache(request) {
  const cache = await caches.open(CACHE_NAME);
  return cache.match(request);
}

function isReadRequest(request) {
  const strategy = request.headers.get("X-SW-Cache-Strategy");
  if (strategy === "read") return true;
  if (strategy === "mutation") return false;
  return request.method === "GET" || request.method === "HEAD";
}

function determineCacheStrategy(request, customStrategies, defaultStrategy) {
  const path = new URL(request.url).pathname;
  for (const [pattern, strategy] of Object.entries(customStrategies)) {
    if (path.startsWith(pattern.replace("*", ""))) return strategy;
  }
  return defaultStrategy;
}

self.addEventListener("fetch", (event) => {
  if (!isReadRequest(event.request)) return;

  const strategy = determineCacheStrategy(event.request, {"/api/*":"network-first","/static/*":"cache-first"}, "cache-first");

  if (strategy === "stale-while-revalidate" || event.request.headers.get("X-SW-Stale") === "true") {
    event.respondWith(staleWhileRevalidate(event, event.request));
    return;
  }

  if (strategy === "network-first") {
    event.respondWith(networkFirst(event, event.request));
    return;
  }

  if (strategy === "cache-only") {
    event.respondWith(cacheOnly(event, event.request));
    return;
  }

  if (strategy === "network-only") {
    event.respondWith(networkOnly(event, event.request));
    return;
  }

  // cache-first (default)
  event.respondWith(cacheFirst(event, event.request));
});

async function cacheFirst(event, request) {
  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);

  const cached = await runtimeCache.match(request);
  if (cached) return cached;

  const precached = await fromPrecache(request);
  if (precached) return precached;

  if (request.mode === "navigate") {
    const precache = await caches.open(CACHE_NAME);
    const entry = await precache.match("/index.html");
    if (entry) return entry;
  }
  const response = await fetch(request);
  if (response.ok) {
    const cloned = response.clone();
    event.waitUntil(
      (async () => {
        await runtimeCache.put(request, cloned);
          const tagsHeader = event.request.headers.get("X-SW-Cache-Tags");
          if (tagsHeader) {
            const url = new URL(event.request.url).href;
            const tags = tagsHeader.split(",").map((t) => t.trim());
            await cacheTagUrl(url, tags);
          }
      })(),
    );
  }
  return response;
}

async function networkFirst(event, request) {
  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      event.waitUntil(
        (async () => {
          await runtimeCache.put(request, cloned);
          const tagsHeader = event.request.headers.get("X-SW-Cache-Tags");
          if (tagsHeader) {
            const url = new URL(event.request.url).href;
            const tags = tagsHeader.split(",").map((t) => t.trim());
            await cacheTagUrl(url, tags);
          }
        })(),
      );
    }
    return response;
  } catch {
    const cached = await runtimeCache.match(request);
    if (cached) return cached;

    const precached = await fromPrecache(request);
    if (precached) return precached;

  if (request.mode === "navigate") {
    const precache = await caches.open(CACHE_NAME);
    const entry = await precache.match("/index.html");
    if (entry) return entry;
  }
    throw new Error("Request failed and no cached response available");
  }
}

async function staleWhileRevalidate(event, request) {
  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
  const cached = await runtimeCache.match(request);

  if (cached) {
    event.waitUntil(refreshCache(runtimeCache, request));
    return cached;
  }

  const precached = await fromPrecache(request);
  if (precached) {
    event.waitUntil(refreshCache(runtimeCache, request));
    return precached;
  }

  const response = await fetch(request);
  if (response.ok) {
    await runtimeCache.put(request, response.clone());
      const tagsHeader = request.headers.get("X-SW-Cache-Tags");
      if (tagsHeader) {
        const url = new URL(request.url).href;
        const tags = tagsHeader.split(",").map((t) => t.trim());
        await cacheTagUrl(url, tags);
      }
  }
  return response;
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
}

async function cacheOnly(event, request) {
  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);

  const byRequest = await runtimeCache.match(request);
  if (byRequest) return byRequest;

  const precached = await fromPrecache(request);
  if (precached) return precached;

  return new Response("Not in cache", { status: 404 });
}

async function networkOnly(event, request) {
  return fetch(request);
}

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
}

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
        throw new Error(`Network request failed: ${error.message}`);
      }
    }
  }
};

if (typeof self !== 'undefined') {
  self.SWOFF = SWOFF;
}