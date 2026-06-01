/**
 * Generates the SW fetch event handler with all caching strategies.
 *
 * Strategy dispatch tiers (highest to lowest priority):
 *   1. X-SW-Strategy header — per-request override from fetchWithCache({ strategy })
 *   2. URL pattern match — from features.serviceWorker.strategies in swoff.config.json
 *   3. defaultStrategy — fallback from features.serviceWorker.defaultStrategy
 *
 * Strategies:
 *   - cache-first:      Serve cache if exists, fetch if missing. No bg refresh.
 *   - network-first:    Try network first, fall back to cache on failure.
 *   - stale-while-revalidate: Serve cache + always refresh in background.
 *   - cache-only:       Never fetch. Cache hit or 404.
 *   - network-only:     Never cache. Always fetch.
 *   - reactive:         Serve cache + refresh on configurable triggers (interval,
 *                       onFocus, onReconnect). staleTime gates ALL triggers.
 *
 * staleTime, refetchInterval, refetchOnFocus, refetchOnReconnect are
 * reactive-only fields. Non-reactive strategies ignore them.
 *
 * Background refreshes use a shared batch queue with rate limiting.
 * On successful refresh, CACHE_UPDATED is posted to all clients.
 */

export function generateFetchHandler(
  swConfig: {
    strategy: {
      default: string;
      patterns: Record<
        string,
        | string
        | {
            strategy: string;
            staleTime?: number;
            refetchInterval?: number;
            refetchOnReconnect?: boolean;
            refetchOnFocus?: boolean;
          }
      >;
      reactive?: {
        defaults: {
          staleTime?: number;
          refetchInterval?: number;
          refetchOnReconnect?: boolean;
          refetchOnFocus?: boolean;
        };
      };
      mode?: "all" | "explicit-only";
      normalizeKey?: boolean;
      ignoreQueryParams?: string[];
    };
    navigation: {
      mode?: "spa" | "default";
      preload?: boolean;
      fallback?: string;
    };
    refetchQueue: {
      batchSize?: number;
      batchDelayMs?: number;
      maxRetries?: number;
      retryDelayMs?: number;
    };
  },
  tagInvalidation: boolean,
  mutationQueueEnabled: boolean,
): string {
  const {
    strategy: {
      default: defaultStrategy,
      patterns: strategies,
      mode: cacheStrategy = "all",
      normalizeKey: normalizeCacheKey,
      ignoreQueryParams,
    },
    navigation: {
      mode: navMode = "spa",
      preload: navigationPreload,
      fallback: spaPath = "/index.html",
    },
    refetchQueue: {
      batchSize: refetchBatchSize = 5,
      batchDelayMs: refetchBatchDelayMs = 1000,
      maxRetries: refetchMaxRetries = 3,
      retryDelayMs: refetchRetryDelayMs = 1000,
    },
  } = swConfig;
  const {
    staleTime: globalStaleTime,
    refetchInterval: globalRefetchInterval,
    refetchOnReconnect: globalRefetchOnReconnect,
    refetchOnFocus: globalRefetchOnFocus,
  } = swConfig.strategy.reactive?.defaults || {};

  const staleVersionCode = tagInvalidation
    ? `
    cleanStaleVersions();
    if (staleVersions.has(cacheKey(request))) {
      queueRefresh(cacheKey(request), new URL(request.url).href);
    }`
    : "";

  const tagCode = tagInvalidation
    ? `
  const tagsHeader = request.headers.get("X-SW-Cache-Tags");
  if (tagsHeader) {
    const cacheKeyUrl = cacheKey(request);
    const actualUrl = new URL(request.url).href;
    const tags = tagsHeader.split(",").map((t) => t.trim());
    await cacheTagUrl(cacheKeyUrl, actualUrl, tags);
  }`
    : "";

  const reactGlobalDefaults = {
    staleTime: globalStaleTime,
    refetchInterval: globalRefetchInterval,
    refetchOnReconnect: globalRefetchOnReconnect,
    refetchOnFocus: globalRefetchOnFocus,
  };

  const reactivePatterns = Object.entries(strategies)
    .filter(([, entry]) => {
      const resolved = typeof entry === "string" ? { strategy: entry } : entry;
      return resolved.strategy === "reactive";
    })
    .map(([pattern, entry]) => {
      const resolved = typeof entry === "string" ? { strategy: entry } : entry;
      return {
        pattern,
        staleTime: resolved.staleTime ?? reactGlobalDefaults.staleTime,
        refetchInterval:
          resolved.refetchInterval ?? reactGlobalDefaults.refetchInterval,
        refetchOnReconnect:
          resolved.refetchOnReconnect ?? reactGlobalDefaults.refetchOnReconnect,
        refetchOnFocus:
          resolved.refetchOnFocus ?? reactGlobalDefaults.refetchOnFocus,
      };
    });

  const trimDecl = `const REFETCH_BATCH_SIZE = ${refetchBatchSize};
const REFETCH_BATCH_DELAY_MS = ${refetchBatchDelayMs};
const REFRESH_MAX_RETRIES = ${refetchMaxRetries};
const REFRESH_RETRY_DELAY_MS = ${refetchRetryDelayMs};`;

  const GLOB_CODE = "\n" +
"// --- Glob Pattern Matching ---\n" +
"\n" +
"function escapeGlobMeta(s) {\n" +
'  return s.replace(/[.+^${}()|[\\]\\\\]/g, "\\\\$$&");\n' +
"}\n" +
"\n" +
"function globPartRe(part) {\n" +
'  for (var o = "", i = 0; i < part.length; i++) {\n' +
"    var c = part[i];\n" +
'    if (c === "*") { o += "[^/]*"; }\n' +
'    else if (c === "?") { o += "[^/]"; }\n' +
'    else if (c === "{") {\n' +
'      var cl = part.indexOf("}", i);\n' +
'      if (cl === -1) { o += "\\\\" + c; }\n' +
"      else {\n" +
'        o += "(?:" + part.slice(i + 1, cl).split(",").map(function(s) { return escapeGlobMeta(s.trim()); }).join("|") + ")";\n' +
"        i = cl;\n" +
"      }\n" +
'    } else { o += "\\\\" + c; }\n' +
"  }\n" +
"  return o;\n" +
"}\n" +
"\n" +
"function matchGlob(path, pattern) {\n" +
'  if (pattern.charAt(0) === "!") return !matchGlob(path, pattern.slice(1));\n' +
'  var parts = pattern.split("/").filter(Boolean);\n' +
'  var pps = path.split("/").filter(Boolean);\n' +
"  var pi = 0, ppi = 0;\n" +
"  while (pi < parts.length && ppi < pps.length) {\n" +
"    var part = parts[pi];\n" +
'    if (part === "**") {\n' +
"      if (pi === parts.length - 1) return true;\n" +
"      var nxt = parts[pi + 1];\n" +
"      var found = -1;\n" +
"      for (var j = ppi; j < pps.length; j++) {\n" +
'        if (nxt.indexOf("*") > -1 || nxt.indexOf("?") > -1 || nxt.indexOf("{") > -1) {\n' +
'          if (new RegExp("^" + globPartRe(nxt) + "$").test(pps[j])) { found = j; break; }\n' +
"        } else if (nxt === pps[j]) { found = j; break; }\n" +
"      }\n" +
"      if (found === -1) return false;\n" +
"      ppi = found;\n" +
"      pi++;\n" +
"      continue;\n" +
"    }\n" +
'    if (part.indexOf("*") > -1 || part.indexOf("?") > -1 || part.indexOf("{") > -1) {\n' +
'      if (!new RegExp("^" + globPartRe(part) + "$").test(pps[ppi])) return false;\n' +
"    } else if (part !== pps[ppi]) return false;\n" +
"    pi++;\n" +
"    ppi++;\n" +
"  }\n" +
"  return pi === parts.length && ppi === pps.length;\n" +
"}\n" +
"\n";

  return `${trimDecl}
// --- Batch Refresh Queue ---

const _refreshQueue = new Map();
let _refreshQueuePromise = null;

function queueRefresh(cacheKeyUrl, actualUrl${
    tagInvalidation ? ", tags" : ""
  }) {
  // Use Map keyed by cacheKey for proper deduplication${
    tagInvalidation
      ? `
  // Don't let a tagless (SWR/reactive) refresh override an invalidation-triggered entry with tags
  if (_refreshQueue.has(cacheKeyUrl) && !tags) return;`
      : ""
  }
  _refreshQueue.set(cacheKeyUrl, { cacheKey: cacheKeyUrl, actualUrl: actualUrl || cacheKeyUrl, retryCount: 0${
    tagInvalidation ? ", tags: tags || null" : ""
  } });
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
          const response = await fetch(fetchUrl);
          if (response.ok) {
            const request = new Request(entry.cacheKey);
            await storeRuntime(request, response);${
              tagInvalidation
                ? `
          if (entry.tags && typeof cacheTagUrl !== "undefined") {
            await cacheTagUrl(entry.cacheKey, fetchUrl, entry.tags);
          }`
                : ""
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

const REACTIVE_PATTERNS = ${JSON.stringify(reactivePatterns)};

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

${(() => {
  const patternsWithInterval = reactivePatterns.filter(
    (p): p is typeof p & { refetchInterval: number } =>
      !!p.refetchInterval && p.refetchInterval > 0,
  );
  if (patternsWithInterval.length === 0) return "";
  return `// Start intervals for reactive patterns with refetchInterval
(async () => {
${patternsWithInterval
  .map(
    (p) =>
      `  setInterval(async () => {
    const cache = await caches.open(CACHE_NAME_RUNTIME);
    const keys = await cache.keys();
    for (const request of keys) {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/__swc/")) continue;
      if (!matchGlob(url.pathname, "${p.pattern}")) continue;
      const config = findReactiveConfig(url.href);
      if (!config) continue;
      const cached = await cache.match(request);
      if (cached && shouldReactiveRefresh(cached, config)) {
        queueRefresh(request.url, url.href);
      }
    }
  }, ${p.refetchInterval * 1000});`,
  )
  .join("\n")}
})();
`;
})()}
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
  const url = new URL(request.url);${
    normalizeCacheKey
      ? `
  // Sort query params alphabetically for consistent cache keys
  if (url.search) {
    const params = new URLSearchParams(url.search);
    params.sort();
    url.search = params.toString();
  }`
      : ""
  }${
    ignoreQueryParams && ignoreQueryParams.length > 0
      ? `
  // Strip configured query params from cache key
  const ignore = ${JSON.stringify(ignoreQueryParams)};
  if (url.search) {
    const params = new URLSearchParams(url.search);
    for (const key of ignore) params.delete(key);
    url.search = params.toString();
  }`
      : ""
  }
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
  await storeRuntime(request, response);${tagCode}
}

async function fromSpaFallback(request) {
  if (request.mode === "navigate") {
    const cache = await caches.open(CACHE_NAME);
    return cache.match("${spaPath}");
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

${GLOB_CODE}// --- Strategy Selection (3-tier config resolution) ---

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

${
  mutationQueueEnabled
    ? `// --- Mutation Queue IDB Helpers ---

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

`
    : ""
}self.addEventListener("fetch", (event) => {
  const { request } = event;${
    mutationQueueEnabled
      ? `
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (request.headers.get("X-SW-Cache-Strategy") === "mutation") {
      event.respondWith(handleMutation(event));
      return;
    }
    if (!request.headers.get("X-SW-Cache-Key")) return;
  }`
      : `
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (!request.headers.get("X-SW-Cache-Key")) return;
  }`
  }
  ${cacheStrategy === "explicit-only" ? `if (!request.headers.get("X-SW-Cache-Strategy")) return;` : ""}
  applyStrategy(event, request, determineCacheStrategy(event.request, ${JSON.stringify(strategies)}, { defaultStrategy: "${defaultStrategy}" }));
});

// --- Strategies ---

${
  navigationPreload
    ? `
async function fetchWithPreload(event, request) {
  try {
    const preload = await event.preloadResponse;
    if (preload) return preload;
  } catch {}
  return fetch(request);
}
`
    : ""
}const _fetch = ${navigationPreload ? "fetchWithPreload" : `(event, request) => fetch(request)`};

async function cacheFirst(event, request) {
  const cached = await fromRuntime(request);
  if (cached) {${staleVersionCode}
    return markFromCache(cached);
  }

  const precached = await fromPrecache(request);
  if (precached) return markFromCache(precached);

  const fallback = await fromSpaFallback(request);
  if (fallback) return fallback;

  const response = await _fetch(event, request);
  if (response.ok) {
    const responseToCache = response.clone();
    event.waitUntil(cacheResponse(request, responseToCache));
  }
  return response;
}

async function networkFirst(event, request) {
  try {
    const response = await _fetch(event, request);
    if (response.ok) {
      const responseToCache = response.clone();
      event.waitUntil(cacheResponse(request, responseToCache));
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

  const response = await _fetch(event, request);
  if (response.ok) {
    const responseToCache = response.clone();
    await cacheResponse(request, responseToCache);
  }
  return response;
}

async function reactiveStrategy(event, request, staleTime) {
  const cached = await fromRuntime(request);
  // Per-request staleTime header overrides config-level staleTime
  const headerStale = request.headers.get("X-SW-Stale-Time");
  const effectiveStaleTime = headerStale !== null ? Number(headerStale) : staleTime;
  if (cached) {${staleVersionCode}
    if (shouldReactiveRefresh(cached, { staleTime: effectiveStaleTime })) {
      event.waitUntil(queueRefresh(cacheKey(request), new URL(request.url).href));
    }
    return markFromCache(cached);
  }

  const precached = await fromPrecache(request);
  if (precached) return markFromCache(precached);

  const fallback = await fromSpaFallback(request);
  if (fallback) return fallback;

  const response = await _fetch(event, request);
  if (response.ok) {
    const responseToCache = response.clone();
    await cacheResponse(request, responseToCache);
  }
  return response;
}

async function cacheOnly(event, request) {
  const cached = await fromRuntime(request);
  if (cached) {${staleVersionCode}
    return markFromCache(cached);
  }

  const precached = await fromPrecache(request);
  if (precached) return markFromCache(precached);

  return new Response("Not in cache", { status: 404 });
}

async function networkOnly(event, request) {
  return _fetch(event, request);
}`;
}
