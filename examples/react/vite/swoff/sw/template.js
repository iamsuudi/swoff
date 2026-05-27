/**
 * Swoff Service Worker - Auto-Generated
 * Generated from swoff.config.json
 * DO NOT EDIT MANUALLY
 * Version: 0.0.0
 * Features: version.enabled=true, mutationQueue=true, backgroundSync=true, tagInvalidation=true
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
      let attempted = 0;
      for (const asset of ASSETS_TO_CACHE) {
        attempted++;
        try {
          const request = new Request(asset.url, asset.options);
          await cache.add(request);
          downloaded++;
        } catch (err) {
          console.error(`Failed to cache ${asset.url}:`, err);
        }
        const percent = Math.round((attempted / ASSETS_TO_CACHE.length) * 100);
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        clients.forEach((client) => {
          client.postMessage({
            type: "SW_PROGRESS",
            percent,
            downloaded,
            total: ASSETS_TO_CACHE.length,
          });
        });
      }
      if (AUTO_SKIP_WAITING) self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== CACHE_NAME_RUNTIME).map((key) => caches.delete(key))
      );
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
  if (event.data.type === "CLEAR_RUNTIME_CACHE") {
    event.waitUntil(
      caches.delete(CACHE_NAME_RUNTIME).then(() => {
        return caches.open(CACHE_NAME_RUNTIME);
      }),
    );
  }
});
const GLOBAL_MAX_ENTRIES = 0;
const GLOBAL_MAX_AGE = 0;
const GLOBAL_STALE_TIME = 60;
// --- Cache Key ---

function cacheKey(request) {
  const key = request.headers.get("X-SW-Cache-Key");
  if (key) return new URL("/__swc/" + key, self.location.origin).href;
  return new URL(request.url).href;
}

// --- Cache Helpers ---

async function fromPrecache(request) {
  const cache = await caches.open(CACHE_NAME);
  return cache.match(new URL(request.url).pathname);
}

async function fromRuntime(request) {
  const cache = await caches.open(CACHE_NAME_RUNTIME);
  return cache.match(cacheKey(request));
}

async function storeRuntime(request, response) {
  const cache = await caches.open(CACHE_NAME_RUNTIME);
  const headers = new Headers(response.headers);
  headers.set("X-SW-Cached-At", String(Date.now()));
  const cloned = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(cacheKey(request), cloned);
}

async function cacheResponse(request, response) {
  await storeRuntime(request, response);
  const tagsHeader = request.headers.get("X-SW-Cache-Tags");
  if (tagsHeader) {
    const cacheKeyUrl = cacheKey(request);
    const actualUrl = new URL(request.url).href;
    const tags = tagsHeader.split(",").map((t) => t.trim());
    await cacheTagUrl(cacheKeyUrl, actualUrl, tags);
  }
}

async function fromSpaFallback(request) {
  if (request.mode === "navigate") {
    const cache = await caches.open(CACHE_NAME);
    return cache.match("/index.html");
  }
}

// --- Response Helpers ---

function markFromCache(response) {
  const headers = new Headers(response.headers);
  headers.set("X-SW-From-Cache", "true");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isStale(response, staleTimeSeconds) {
  if (!staleTimeSeconds || staleTimeSeconds <= 0) return false;
  const cachedAt = response.headers.get("X-SW-Cached-At");
  if (!cachedAt) return false;
  return Date.now() - Number(cachedAt) > staleTimeSeconds * 1000;
}

// --- Strategy Selection (3-tier config resolution) ---

function resolveStrategyEntry(entry) {
  return typeof entry === "string" ? { strategy: entry } : entry;
}

function determineCacheStrategy(request, customStrategies, globalDefaults) {
  const override = request.headers.get("X-SW-Strategy");
  if (override) {
    return {
      strategy: override,
      staleTime: Number(request.headers.get("X-SW-Stale-Time")) || globalDefaults.staleTime,
      maxCacheEntries: Number(request.headers.get("X-SW-Max-Entries")) || globalDefaults.maxCacheEntries,
      maxCacheAge: Number(request.headers.get("X-SW-Max-Age")) || globalDefaults.maxCacheAge,
    };
  }
  const path = new URL(request.url).pathname;
  for (const [pattern, entry] of Object.entries(customStrategies)) {
    if (path.startsWith(pattern.replace("*", ""))) {
      const resolved = resolveStrategyEntry(entry);
      return {
        strategy: resolved.strategy,
        staleTime: resolved.staleTime ?? globalDefaults.staleTime,
        maxCacheEntries: resolved.maxCacheEntries ?? globalDefaults.maxCacheEntries,
        maxCacheAge: resolved.maxCacheAge ?? globalDefaults.maxCacheAge,
      };
    }
  }
  return {
    strategy: globalDefaults.defaultStrategy,
    staleTime: globalDefaults.staleTime,
    maxCacheEntries: globalDefaults.maxCacheEntries,
    maxCacheAge: globalDefaults.maxCacheAge,
  };
}

function applyStrategy(event, request, config) {
  const { strategy, staleTime, maxCacheEntries, maxCacheAge } = config;
  if (strategy === "stale-while-revalidate") {
    event.respondWith(staleWhileRevalidate(event, request, staleTime, maxCacheEntries, maxCacheAge));
  } else if (strategy === "network-first") {
    event.respondWith(networkFirst(event, request, staleTime, maxCacheEntries, maxCacheAge));
  } else if (strategy === "cache-only") {
    event.respondWith(cacheOnly(event, request, staleTime, maxCacheEntries, maxCacheAge));
  } else if (strategy === "network-only") {
    event.respondWith(networkOnly(event, request));
  } else {
    event.respondWith(cacheFirst(event, request, staleTime, maxCacheEntries, maxCacheAge));
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (!request.headers.get("X-SW-Cache-Key")) return;
  }
  
  applyStrategy(event, request, determineCacheStrategy(event.request, {"/api/*":{"strategy":"network-first","staleTime":30},"/static/*":"cache-first"}, { defaultStrategy: "cache-first", staleTime: GLOBAL_STALE_TIME, maxCacheEntries: GLOBAL_MAX_ENTRIES, maxCacheAge: GLOBAL_MAX_AGE }));
});

// --- Strategies ---


async function fetchWithPreload(event, request) {
  try {
    const preload = await event.preloadResponse;
    if (preload) return preload;
  } catch {}
  return fetch(request);
}
const _fetch = fetchWithPreload;


function _trim(cacheName, maxEntries, maxAge) {

}

async function cacheFirst(event, request, staleTime, maxEntries, maxAge) {
  const cached = await fromRuntime(request);
  if (cached) {
    cleanStaleVersions();
    if (staleVersions.has(cacheKey(request))) {
      event.waitUntil(refreshCache(request).then(() => staleVersions.delete(cacheKey(request))));
    }
    if (isStale(cached, staleTime)) {
      event.waitUntil(refreshCache(request));
    }
    return markFromCache(cached);
  }

  const precached = await fromPrecache(request);
  if (precached) return markFromCache(precached);

  const fallback = await fromSpaFallback(request);
  if (fallback) return fallback;

  const response = await _fetch(event, request);
  if (response.ok) {
    event.waitUntil(
      (async () => {
        await cacheResponse(request, response);
        _trim(CACHE_NAME_RUNTIME, maxEntries, maxAge);
      })(),
    );
  }
  return response;
}

async function networkFirst(event, request, staleTime, maxEntries, maxAge) {
  // If cached and fresh (within staleTime), skip network entirely
  if (staleTime > 0) {
    const cached = await fromRuntime(request);
    if (cached && !isStale(cached, staleTime)) {
      return markFromCache(cached);
    }
  }

  try {
    const response = await _fetch(event, request);
    if (response.ok) {
      event.waitUntil(
        (async () => {
          await cacheResponse(request, response);
          _trim(CACHE_NAME_RUNTIME, maxEntries, maxAge);
        })(),
      );
    }
    return response;
  } catch {
    const cached = await fromRuntime(request);
    if (cached) return cached;

    const precached = await fromPrecache(request);
    if (precached) return precached;

    const fallback = await fromSpaFallback(request);
    if (fallback) return fallback;

    throw new Error("Request failed and no cached response available");
  }
}

async function staleWhileRevalidate(event, request, staleTime, maxEntries, maxAge) {
  const cached = await fromRuntime(request);
  if (cached) {
    // Skip background refresh if still fresh
    if (!isStale(cached, staleTime)) {
      return markFromCache(cached);
    }
    event.waitUntil(refreshCache(request));
    return markFromCache(cached);
  }

  const precached = await fromPrecache(request);
  if (precached) {
    event.waitUntil(refreshCache(request));
    return markFromCache(precached);
  }

  const response = await _fetch(event, request);
  if (response.ok) {
    await cacheResponse(request, response);
    _trim(CACHE_NAME_RUNTIME, maxEntries, maxAge);
  }
  return response;
}

async function refreshCache(request) {
  try {
    const key = request.headers.get("X-SW-Cache-Key");
    const fetchRequest = key ? new Request(new URL(request.url).href, { method: request.method, headers: request.headers, body: request.method !== "GET" ? request.body : undefined }) : request;
    const response = await fetch(fetchRequest);
    if (response.ok) {
      await storeRuntime(request, response);
    }
  } catch {
    // Background refresh failed - stale cache remains usable
  }
}

async function cacheOnly(event, request, staleTime, maxEntries, maxAge) {
  const cached = await fromRuntime(request);
  if (cached) {
    cleanStaleVersions();
    if (staleVersions.has(cacheKey(request))) {
      event.waitUntil(refreshCache(request).then(() => staleVersions.delete(cacheKey(request))));
    }
    if (isStale(cached, staleTime)) {
      event.waitUntil(refreshCache(request));
    }
    return markFromCache(cached);
  }

  const precached = await fromPrecache(request);
  if (precached) return markFromCache(precached);

  return new Response("Not in cache", { status: 404 });
}

async function networkOnly(event, request) {
  return _fetch(event, request);
}

const staleVersions = new Map();
const STALE_VERSIONS_MAX = 100;
const STALE_VERSION_TTL = 30 * 60 * 1000;
const TAG_DB_NAME = "swoff-cache-tags";
const TAG_STORE_NAME = "tags";

function cleanStaleVersions() {
  const now = Date.now();
  for (const [url, ts] of staleVersions) {
    if (staleVersions.size > STALE_VERSIONS_MAX || now - ts > STALE_VERSION_TTL) {
      staleVersions.delete(url);
    }
  }
}

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

async function cacheTagUrl(url, actualUrl, tags) {
  const db = await openTagDB();
  const tx = db.transaction(TAG_STORE_NAME, "readwrite");
  const store = tx.objectStore(TAG_STORE_NAME);
  store.put({ url, actualUrl, tags });
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function refetchAfterInvalidation(url, actualUrl) {
  const fetchUrl = actualUrl || url;
  try {
    const response = await fetch(fetchUrl);
    if (response.ok) {
      const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
      await runtimeCache.put(url, response);
      staleVersions.delete(url);
      return true;
    }
  } catch {
    // fetch failed (network error, auth required, etc.)
  }
  staleVersions.set(url, Date.now());
  return false;
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

  // Remove from tag index
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

  // Background refetch each deleted URL; keep stale on failure
  for (const entry of entries) {
    refetchAfterInvalidation(entry.url, entry.actualUrl);
  }

  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "TAG_INVALIDATED", tag });
  });
}

// --- Push Notification Handlers ---

self.addEventListener("push", (event) => {
  let data;

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "New Update", body: event.data?.text() || "" };
  }

  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "",
    image: data.image || undefined,
    vibrate: data.vibrate || [200, 100, 200],
    data: {
      url: data.url || "/",
      ...(data.data || {}),
    },
    actions: data.actions || [],
    tag: data.tag || undefined,
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(data.title || "Update", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";
  const action = event.action;

  event.waitUntil(
    (async () => {
      if (action) {
        // Handle action clicks (e.g., "reply", "dismiss")
      }

      const clients = await self.clients.matchAll({ type: "window" });

      for (const client of clients) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(url, self.location.origin);

        if (clientUrl.pathname === targetUrl.pathname && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })(),
  );
});



self.addEventListener("sync", (event) => {
  if (event.tag === "sync-mutations") {
    event.waitUntil(processMutationQueueInSW());
  }
});

const SW_BATCH_SIZE = 5;
const SW_BATCH_DELAY_MS = 1000;
const SW_MAX_RETRIES = 3;
const SW_RETRY_BACKOFF_MS = 2000;

function swSleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processMutationQueueInSW() {
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

    const total = queue.length;
    for (const item of queue) {
      if (item.retryCount >= SW_MAX_RETRIES) {
        await removeFromSWQueue(db, item.id);
        failed++;
        continue;
      }

      // Skip items whose backoff delay hasn't elapsed yet
      if (item.nextRetryAt && Date.now() < item.nextRetryAt) {
        continue;
      }

      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: { "Content-Type": "application/json", ...item.headers },
          body: JSON.stringify(item.body),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        if (item.tags) {
          item.tags.forEach((tag) => tagsToInvalidate.add(tag));
        }

        await removeFromSWQueue(db, item.id);
        succeeded++;
      } catch {
        item.retryCount++;
        item.nextRetryAt = Date.now() + SW_RETRY_BACKOFF_MS * Math.pow(2, item.retryCount - 1);
        await updateInSWQueue(db, item);
        failed++;
      }

      // Rate limiting delay between mutations
      if (SW_BATCH_DELAY_MS > 0 && succeeded + failed < total) {
        await swSleep(SW_BATCH_DELAY_MS);
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
}
// Dev mode fallback
if (!CACHE_NAME) CACHE_NAME = "sw-dev-cache";
