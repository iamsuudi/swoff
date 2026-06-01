/**
 * Swoff Service Worker - Auto-Generated
 * Generated from swoff.config.json
 * DO NOT EDIT MANUALLY
 * Version: 0.0.0
 * Features: version=package, mutationQueue=true, backgroundSync=true, tagInvalidation=true
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

const MAX_RUNTIME_CACHE_AGE = 2592000;

async function evictStaleRuntimeCache() {
  const cache = await caches.open(CACHE_NAME_RUNTIME);
  const keys = await cache.keys();
  const cutoff = Date.now() - MAX_RUNTIME_CACHE_AGE * 1000;
  const promises = [];
  for (const request of keys) {
    promises.push((async () => {
      const response = await cache.match(request);
      const cachedAt = response?.headers.get("X-SW-Cached-At");
      if (cachedAt && Number(cachedAt) < cutoff) {
        await cache.delete(request);
      }
    })());
  }
  await Promise.all(promises);
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await evictStaleRuntimeCache();
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
  if (event.data.type === "GET_URLS_FOR_TAG" && event.data.tag) {
    const urls = getUrlsForTag(event.data.tag);
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: "URLS_FOR_TAG", urls });
    }
  }
  if (event.data.type === "GET_TAGS_FOR_URL" && event.data.url) {
    const tags = getTagsForUrl(event.data.url);
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: "TAGS_FOR_URL", tags });
    }
  }
  if (event.data.type === "INVALIDATE_MATCHING" && event.data.glob) {
    event.waitUntil(invalidateMatching(event.data.glob));
  }
  if (event.data.type === "ONLINE") {
    event.waitUntil(handleOnline());
  }
  if (event.data.type === "FOCUS") {
    event.waitUntil(handleOnFocus());
  }

});
const REFETCH_BATCH_SIZE = 5;
const REFETCH_BATCH_DELAY_MS = 1000;
const REFRESH_MAX_RETRIES = 3;
const REFRESH_RETRY_DELAY_MS = 1000;
// --- Batch Refresh Queue ---

const _refreshQueue = new Map();
let _refreshQueuePromise = null;

function queueRefresh(cacheKeyUrl, actualUrl, tags, method, body, contentType) {
  // Use Map keyed by cacheKey for proper deduplication
  // Don't let a tagless (SWR/reactive) refresh override an invalidation-triggered entry with tags
  if (_refreshQueue.has(cacheKeyUrl) && !tags) return;
  _refreshQueue.set(cacheKeyUrl, { cacheKey: cacheKeyUrl, actualUrl: actualUrl || cacheKeyUrl, retryCount: 0, tags: tags || null, method: method || null, body: body || null, contentType: contentType || null });
  if (!_refreshQueuePromise) {
    _refreshQueuePromise = _processRefreshQueue();
  }
  return _refreshQueuePromise;
}

async function resolveActualUrl(entry) {
  if (entry.actualUrl) return entry.actualUrl;
  const url = entry.cacheKey;
  if (url.includes("/__swc/")) {
    // Virtual cache key — look up the real URL from tag registry
    try {
      const db = await openTagDB();
      const tx = db.transaction(TAG_STORE_NAME, "readonly");
      const store = tx.objectStore(TAG_STORE_NAME);
      const stored = await new Promise((resolve) => {
        const req = store.get(url);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      db.close();
      if (stored?.actualUrl) return stored.actualUrl;
    } catch {}
  }
  return url;
}

async function _processRefreshQueue() {
  try {
    while (_refreshQueue.size > 0) {
      const batch = [];
      for (const [cacheKey, entry] of _refreshQueue) {
        if (batch.length >= REFETCH_BATCH_SIZE) break;
        if (entry.nextRetryAt && entry.nextRetryAt > Date.now()) continue;
        batch.push(entry);
        _refreshQueue.delete(cacheKey);
      }
      if (batch.length === 0) break;

      const clients = await self.clients.matchAll();

      await Promise.allSettled(batch.map(async (entry) => {
        const fetchUrl = await resolveActualUrl(entry);
        try {
          const fetchOpts = {};
          if (entry.method && entry.method !== "GET" && entry.method !== "HEAD") {
            fetchOpts.method = entry.method;
            if (entry.body) fetchOpts.body = entry.body;
            if (entry.contentType) fetchOpts.headers = { "Content-Type": entry.contentType };
          }
          const response = await fetch(fetchUrl, fetchOpts);
          if (response.ok) {
            const request = new Request(entry.cacheKey);
            await storeRuntime(request, response);
          if (entry.tags && typeof cacheTagUrl !== "undefined") {
            await cacheTagUrl(entry.cacheKey, fetchUrl, entry.tags, entry.method, entry.body, entry.contentType);
          }
            // Clean up stale version tracking on successful refresh
            if (typeof staleVersions !== "undefined" && staleVersions.has(entry.cacheKey)) {
              staleVersions.delete(entry.cacheKey);
            }
            for (const client of clients) {
              client.postMessage({ type: "CACHE_UPDATED", url: fetchUrl });
            }
          }
        } catch {
          // Refresh failed — retry with exponential backoff
          if (entry.retryCount < REFRESH_MAX_RETRIES) {
            entry.retryCount++;
            const delay = REFRESH_RETRY_DELAY_MS * Math.pow(2, entry.retryCount - 1);
            entry.nextRetryAt = Date.now() + delay;
            _refreshQueue.set(entry.cacheKey, entry);
            setTimeout(() => {
              if (!_refreshQueuePromise) {
                _refreshQueuePromise = _processRefreshQueue();
              }
            }, delay);
          }
        }
      }));

      if (_refreshQueue.size > 0 && REFETCH_BATCH_DELAY_MS > 0) {
        await new Promise(r => setTimeout(r, REFETCH_BATCH_DELAY_MS));
      }
    }
  } finally {
    _refreshQueuePromise = null;
  }
}

// --- Reactive Patterns (extracted for interval/focus/reconnect) ---

const REACTIVE_PATTERNS = [];

function findReactiveConfig(url) {
  const path = new URL(url).pathname;
  for (const cfg of REACTIVE_PATTERNS) {
    if (matchGlob(path, cfg.pattern)) return cfg;
  }
  return null;
}

function shouldReactiveRefresh(cached, config) {
  if (!config.staleTime && config.staleTime !== 0) return true;
  if (config.staleTime === 0) return true;
  return isStale(cached, config.staleTime);
}

// --- Reactive Interval Timers ---


async function handleOnline() {
  const clients = await self.clients.matchAll();
  if (clients.length === 0) return;

  // Step 1: Retry stale version entries (failed refetches after invalidation)
  if (typeof staleVersions !== "undefined") {
    const staleUrls = [...staleVersions.keys()];
    for (const url of staleUrls) {
      queueRefresh(url, url);
    }
  }

  // Step 2: Refresh reactive entries with refetchOnReconnect
  const cache = await caches.open(CACHE_NAME_RUNTIME);
  const keys = await cache.keys();
  for (const request of keys) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/__swc/")) continue;
    const config = findReactiveConfig(url.href);
    if (!config || !config.refetchOnReconnect) continue;
    const cached = await cache.match(request);
    if (cached && shouldReactiveRefresh(cached, config)) {
      queueRefresh(request.url, url.href);
    }
  }
}

async function handleOnFocus() {
  const cache = await caches.open(CACHE_NAME_RUNTIME);
  const keys = await cache.keys();
  for (const request of keys) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/__swc/")) continue;
    const config = findReactiveConfig(url.href);
    if (!config || !config.refetchOnFocus) continue;
    const cached = await cache.match(request);
    if (cached && shouldReactiveRefresh(cached, config)) {
      queueRefresh(request.url, url.href);
    }
  }
}

// --- Cache Key ---

function cacheKey(request) {
  const key = request.headers.get("X-SW-Cache-Key");
  if (key) return new URL("/__swc/" + key, self.location.origin).href;
  const url = new URL(request.url);
  return url.href;
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
    const method = request.method;
    let body = null;
    let contentType = null;
    if (method !== "GET" && method !== "HEAD") {
      contentType = request.headers.get("Content-Type");
      try {
        body = await request.clone().text();
      } catch {}
    }
    await cacheTagUrl(cacheKeyUrl, actualUrl, tags, method, body, contentType);
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
  if (staleTimeSeconds == null || staleTimeSeconds <= 0) return false;
  const cachedAt = response.headers.get("X-SW-Cached-At");
  if (!cachedAt) return false;
  return Date.now() - Number(cachedAt) > staleTimeSeconds * 1000;
}


// --- Glob Pattern Matching ---

function escapeGlobMeta(s) {
  return s.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

function globPartRe(part) {
  for (var o = "", i = 0; i < part.length; i++) {
    var c = part[i];
    if (c === "*") { o += "[^/]*"; }
    else if (c === "?") { o += "[^/]"; }
    else if (c === "{") {
      var cl = part.indexOf("}", i);
      if (cl === -1) { o += "\\" + c; }
      else {
        o += "(?:" + part.slice(i + 1, cl).split(",").map(function(s) { return escapeGlobMeta(s.trim()); }).join("|") + ")";
        i = cl;
      }
    } else { o += "\\" + c; }
  }
  return o;
}

function matchGlob(path, pattern) {
  if (pattern.charAt(0) === "!") return !matchGlob(path, pattern.slice(1));
  var parts = pattern.split("/").filter(Boolean);
  var pps = path.split("/").filter(Boolean);
  var pi = 0, ppi = 0;
  while (pi < parts.length && ppi < pps.length) {
    var part = parts[pi];
    if (part === "**") {
      if (pi === parts.length - 1) return true;
      var nxt = parts[pi + 1];
      var found = -1;
      for (var j = ppi; j < pps.length; j++) {
        if (nxt.indexOf("*") > -1 || nxt.indexOf("?") > -1 || nxt.indexOf("{") > -1) {
          if (new RegExp("^" + globPartRe(nxt) + "$").test(pps[j])) { found = j; break; }
        } else if (nxt === pps[j]) { found = j; break; }
      }
      if (found === -1) return false;
      ppi = found;
      pi++;
      continue;
    }
    if (part.indexOf("*") > -1 || part.indexOf("?") > -1 || part.indexOf("{") > -1) {
      if (!new RegExp("^" + globPartRe(part) + "$").test(pps[ppi])) return false;
    } else if (part !== pps[ppi]) return false;
    pi++;
    ppi++;
  }
  return pi === parts.length && ppi === pps.length;
}

// --- Strategy Selection (3-tier config resolution) ---

function resolveStrategyEntry(entry) {
  return typeof entry === "string" ? { strategy: entry } : entry;
}

function determineCacheStrategy(request, customStrategies, globalDefaults) {
  const override = request.headers.get("X-SW-Strategy");
  if (override) {
    const cfg = { strategy: override };
    const hStale = request.headers.get("X-SW-Stale-Time");
    if (hStale !== null) cfg.staleTime = Number(hStale);
    const hFocus = request.headers.get("X-SW-Refetch-On-Focus");
    if (hFocus !== null) cfg.refetchOnFocus = hFocus !== "false";
    const hReconnect = request.headers.get("X-SW-Refetch-On-Reconnect");
    if (hReconnect !== null) cfg.refetchOnReconnect = hReconnect !== "false";
    return cfg;
  }
  const path = new URL(request.url).pathname;
  for (const [pattern, entry] of Object.entries(customStrategies)) {
    if (matchGlob(path, pattern)) {
      const resolved = resolveStrategyEntry(entry);
      return { strategy: resolved.strategy };
    }
  }
  return { strategy: globalDefaults.defaultStrategy };
}

function determineCacheStrategyForUrl(url, customStrategies, globalDefaults) {
  const path = new URL(url).pathname;
  for (const [pattern, entry] of Object.entries(customStrategies)) {
    if (matchGlob(path, pattern)) {
      const resolved = resolveStrategyEntry(entry);
      return { strategy: resolved.strategy };
    }
  }
  return { strategy: globalDefaults.defaultStrategy };
}

function applyStrategy(event, request, config) {
  const { strategy } = config;
  if (strategy === "reactive") {
    const reactiveCfg = findReactiveConfig(new URL(request.url).href);
    const staleTime = config.staleTime !== undefined ? config.staleTime : reactiveCfg?.staleTime;
    event.respondWith(reactiveStrategy(event, request, staleTime));
  } else if (strategy === "stale-while-revalidate") {
    event.respondWith(staleWhileRevalidate(event, request));
  } else if (strategy === "network-first") {
    event.respondWith(networkFirst(event, request));
  } else if (strategy === "cache-only") {
    event.respondWith(cacheOnly(event, request));
  } else if (strategy === "network-only") {
    event.respondWith(networkOnly(event, request));
  } else {
    event.respondWith(cacheFirst(event, request));
  }
}

// --- Mutation Queue IDB Helpers ---

const MUTATION_DB_NAME = "swoff-queue";
const MUTATION_STORE_NAME = "mutations";
// Bump this when adding new indexes/stores for schema migration
const MUTATION_DB_VERSION = 1;

function openMutationQueueDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MUTATION_DB_NAME, MUTATION_DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(MUTATION_STORE_NAME)) {
        const store = db.createObjectStore(MUTATION_STORE_NAME, { keyPath: "id" });
        store.createIndex("by-timestamp", "timestamp");
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function storeMutationInSW(request) {
  let body, bodyType;
  try {
    body = await request.clone().json();
    bodyType = "json";
  } catch {
    body = await request.clone().text();
    bodyType = "text";
  }

  const tagsHeader = request.headers.get("X-SW-Invalidate-Tags");
  const tags = tagsHeader ? tagsHeader.split(",").map(function(t) { return t.trim(); }) : [];

  const db = await openMutationQueueDB();
  const tx = db.transaction(MUTATION_STORE_NAME, "readwrite");
  tx.objectStore(MUTATION_STORE_NAME).add({
    id: crypto.randomUUID(),
    method: request.method,
    url: new URL(request.url).href,
    body,
    bodyType,
    headers: request.headers.get("Content-Type") ? { "Content-Type": request.headers.get("Content-Type") } : {},
    timestamp: Date.now(),
    retryCount: 0,
    nextRetryAt: 0,
    tags,
  });
  await new Promise(function(resolve, reject) {
    tx.oncomplete = function() { resolve(); };
    tx.onerror = function() { reject(tx.error); };
  });
}

async function handleMutation(event) {
  const request = event.request;
  if (request.headers.get("X-SW-No-Queue") === "true") {
    return fetch(request.clone());
  }
  try {
    return await fetch(request.clone());
  } catch {
    await storeMutationInSW(request);
    // Notify open clients that a mutation was stored so they can try to process
    const clients = await self.clients.matchAll();
    clients.forEach(function(client) {
      client.postMessage({ type: "MUTATION_STORED" });
    });
    const queuedBody = JSON.stringify({ queued: true });
    return new Response(queuedBody, {
      status: 202,
      statusText: "Accepted",
      headers: { "Content-Type": "application/json", "X-SW-Mutation-Queued": "true" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (request.headers.get("X-SW-Cache-Strategy") === "mutation") {
      event.respondWith(handleMutation(event));
      return;
    }
    if (!request.headers.get("X-SW-Cache-Key")) return;
  }
  
  applyStrategy(event, request, determineCacheStrategy(event.request, {"/api/*":"network-first","/static/*":"cache-first"}, { defaultStrategy: "cache-first" }));
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

async function cacheFirst(event, request) {
  const cached = await fromRuntime(request);
  if (cached) {
    cleanStaleVersions();
    if (staleVersions.has(cacheKey(request))) {
      queueRefresh(cacheKey(request), new URL(request.url).href);
    }
    return markFromCache(cached);
  }

  const precached = await fromPrecache(request);
  if (precached) return markFromCache(precached);

  const fallback = await fromSpaFallback(request);
  if (fallback) return fallback;

  const reqForCache = request.clone();
  const response = await _fetch(event, request);
  if (response.ok) {
    const responseToCache = response.clone();
    event.waitUntil(cacheResponse(reqForCache, responseToCache));
  }
  return response;
}

async function networkFirst(event, request) {
  try {
    const reqForCache = request.clone();
    const response = await _fetch(event, request);
    if (response.ok) {
      const responseToCache = response.clone();
      event.waitUntil(cacheResponse(reqForCache, responseToCache));
    }
    return response;
  } catch {
    const cached = await fromRuntime(request);
    if (cached) {
      return markFromCache(cached);
    }

    const precached = await fromPrecache(request);
    if (precached) return markFromCache(precached);

    const fallback = await fromSpaFallback(request);
    if (fallback) return fallback;

    throw new Error("Network request failed and no cached response available");
  }
}

async function staleWhileRevalidate(event, request) {
  const cached = await fromRuntime(request);
  if (cached) {
    event.waitUntil(queueRefresh(cacheKey(request), new URL(request.url).href));
    return markFromCache(cached);
  }

  const precached = await fromPrecache(request);
  if (precached) {
    event.waitUntil(queueRefresh(cacheKey(request), new URL(request.url).href));
    return markFromCache(precached);
  }

  const reqForCache = request.clone();
  const response = await _fetch(event, request);
  if (response.ok) {
    const responseToCache = response.clone();
    await cacheResponse(reqForCache, responseToCache);
  }
  return response;
}

async function reactiveStrategy(event, request, staleTime) {
  const cached = await fromRuntime(request);
  // Per-request staleTime header overrides config-level staleTime
  const headerStale = request.headers.get("X-SW-Stale-Time");
  const effectiveStaleTime = headerStale !== null ? Number(headerStale) : staleTime;
  if (cached) {
    cleanStaleVersions();
    if (staleVersions.has(cacheKey(request))) {
      queueRefresh(cacheKey(request), new URL(request.url).href);
    }
    if (shouldReactiveRefresh(cached, { staleTime: effectiveStaleTime })) {
      event.waitUntil(queueRefresh(cacheKey(request), new URL(request.url).href));
    }
    return markFromCache(cached);
  }

  const precached = await fromPrecache(request);
  if (precached) return markFromCache(precached);

  const fallback = await fromSpaFallback(request);
  if (fallback) return fallback;

  const reqForCache = request.clone();
  const response = await _fetch(event, request);
  if (response.ok) {
    const responseToCache = response.clone();
    await cacheResponse(reqForCache, responseToCache);
  }
  return response;
}

async function cacheOnly(event, request) {
  const cached = await fromRuntime(request);
  if (cached) {
    cleanStaleVersions();
    if (staleVersions.has(cacheKey(request))) {
      queueRefresh(cacheKey(request), new URL(request.url).href);
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
// Bump this when adding new indexes/stores for schema migration
const TAG_DB_VERSION = 1;

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
    const request = indexedDB.open(TAG_DB_NAME, TAG_DB_VERSION);
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

async function cacheTagUrl(url, actualUrl, tags, method, body, contentType) {
  const db = await openTagDB();
  const tx = db.transaction(TAG_STORE_NAME, "readwrite");
  const store = tx.objectStore(TAG_STORE_NAME);
  store.put({ url, actualUrl, tags, method: method || "GET", body: body || null, contentType: contentType || null });
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

  // Remove from tag index and runtime cache
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
  writeDb.close();

  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
  for (const entry of entries) {
    await runtimeCache.delete(entry.url);
  }

  // Enqueue background refetch through batched refresh queue
  for (const entry of entries) {
    staleVersions.set(entry.url, Date.now());
    queueRefresh(entry.url, entry.actualUrl, entry.tags, entry.method, entry.body, entry.contentType);
  }

  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "TAG_INVALIDATED", tag });
  });
}

async function getUrlsForTag(tag) {
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
  return entries.map((e) => ({ url: e.url, actualUrl: e.actualUrl }));
}

async function getTagsForUrl(url) {
  const db = await openTagDB();
  const tx = db.transaction(TAG_STORE_NAME, "readonly");
  const store = tx.objectStore(TAG_STORE_NAME);
  const entry = await new Promise((resolve, reject) => {
    const request = store.get(url);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await db.close();
  return entry ? entry.tags : [];
}

async function invalidateMatching(globPattern) {
  const db = await openTagDB();
  const tx = db.transaction(TAG_STORE_NAME, "readonly");
  const store = tx.objectStore(TAG_STORE_NAME);
  const allEntries = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await db.close();

  const matching = allEntries.filter((entry) => matchGlob(entry.url, globPattern));
  const tags = new Set();
  for (const entry of matching) {
    for (const tag of entry.tags) {
      tags.add(tag);
    }
  }
  await Promise.all([...tags].map((tag) => invalidateByTag(tag)));
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


// --- Server Push Events (SSE) ---

function notifyClientsSSE(connected) {
  self.clients.matchAll().then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({ type: "SSE_STATUS", connected: !!connected });
    });
  });
}

let pushReconnectTimer = null;
let pushAbortController = null;

async function connectPushEvents() {
  try {
    pushAbortController = new AbortController();
    const response = await fetch("/api/events", {
      headers: { Accept: "text/event-stream" },
      credentials: "include",
      signal: pushAbortController.signal,
    });
    if (!response.ok || !response.body) {
      notifyClientsSSE(false);
      scheduleReconnect();
      return;
    }
    notifyClientsSSE(true);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventType = "";
    let dataStr = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          dataStr = line.slice(6);
        } else if (line === "") {
          if (eventType === "invalidate" && dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.tags) {
                parsed.tags.forEach((tag) => invalidateByTag(tag));
              }
            } catch {}
          }
          eventType = "";
          dataStr = "";
        }
      }
    }
  } catch {
    // Connection lost or aborted
  }
  notifyClientsSSE(false);
  scheduleReconnect();
}

function scheduleReconnect() {
  if (pushReconnectTimer) clearTimeout(pushReconnectTimer);
  pushReconnectTimer = setTimeout(connectPushEvents, 5000);
}

self.addEventListener("activate", (event) => {
  event.waitUntil(connectPushEvents());
});



self.addEventListener("sync", (event) => {
  if (event.tag === "sync-mutations") {
    event.waitUntil(processMutationQueueInSW());
  }
});

const SW_BATCH_SIZE = 1;
const SW_BATCH_DELAY_MS = 0;
const SW_MAX_RETRIES = 5;
const SW_RETRY_BACKOFF_MS = 1000;
// Bump this when adding new indexes/stores for schema migration
const SW_DB_VERSION = 1;

function swSleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processMutationQueueInSW() {
  // If any client pages are open, skip entirely — the client always wins when open.
  // Only the SW processes the queue when all tabs are closed (background sync event).
  const activeClients = await self.clients.matchAll();
  if (activeClients.length > 0) return;

  let succeeded = 0;
  let failed = 0;
  const tagsToInvalidate = new Set();
  let db;

  try {
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("swoff-queue", SW_DB_VERSION);
      request.onupgradeneeded = (e) => {
        const idb = e.target.result;
        if (!idb.objectStoreNames.contains("mutations")) {
          const store = idb.createObjectStore("mutations", { keyPath: "id" });
          store.createIndex("by-timestamp", "timestamp");
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });

    const tx = db.transaction("mutations", "readonly");
    const store = tx.objectStore("mutations");
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

      // Stop processing if browser went offline during sync
      if (!self.navigator.onLine) break;

      // Reconstruct request body based on stored bodyType
      let replayBody = null;
      let contentType;
      const bt = item.bodyType || "json";
      if (bt === "formdata") {
        replayBody = new FormData();
        const entries = item.body || [];
        for (let i = 0; i < entries.length; i++) {
          replayBody.append(entries[i][0], entries[i][1]);
        }
      } else if (bt === "blob") {
        replayBody = item.body;
      } else if (bt === "buffer") {
        replayBody = item.body instanceof ArrayBuffer ? new Uint8Array(item.body) : item.body;
      } else if (bt === "text") {
        replayBody = item.body;
      } else if (item.body != null) {
        replayBody = JSON.stringify(item.body);
        contentType = "application/json";
      }

      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            ...(contentType ? { "Content-Type": contentType } : {}),
            ...item.headers,
          },
          ...(replayBody != null ? { body: replayBody } : {}),
          credentials: "same-origin",        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        if (item.tags) {
          item.tags.forEach((tag) => {
            tagsToInvalidate.add(tag);
            if (typeof invalidateByTag !== "undefined") invalidateByTag(tag);
          });
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

      // Emit progress after every SW_BATCH_SIZE mutations
      if ((succeeded + failed) % SW_BATCH_SIZE === 0 || succeeded + failed === total) {
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({
            type: "BACKGROUND_SYNC_PROGRESS",
            detail: { succeeded, failed, total, current: succeeded + failed },
          });
        }
      }
    }
  } catch (err) {
    console.error("Background sync failed:", err);
  } finally {
    if (db) db.close();
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
  const tx = db.transaction("mutations", "readwrite");
  tx.objectStore("mutations").delete(id);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateInSWQueue(db, item) {
  const tx = db.transaction("mutations", "readwrite");
  tx.objectStore("mutations").put(item);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
// Dev mode fallback
if (!CACHE_NAME) CACHE_NAME = "sw-dev-cache";
