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
  swConfig: { defaultStrategy: string; strategies: Record<string, string | { strategy: string; maxCacheEntries?: number; maxCacheAge?: number; staleTime?: number; refetchInterval?: number; refetchOnReconnect?: boolean; refetchOnFocus?: boolean }>; cacheStrategy?: "all" | "explicit-only"; maxCacheEntries?: number; maxCacheAge?: number; navigationPreload?: boolean; navigationMode?: string; spaEntry?: string; refetchBatchSize?: number; refetchBatchDelayMs?: number; ignoreQueryParams?: string[]; normalizeCacheKey?: boolean },
  tagInvalidation: boolean,
): string {
  const { defaultStrategy, strategies, cacheStrategy = "all", maxCacheEntries, maxCacheAge, navigationPreload, navigationMode, spaEntry, refetchBatchSize = 5, refetchBatchDelayMs = 1000, ignoreQueryParams, normalizeCacheKey } = swConfig;

  const navMode = navigationMode ?? "spa";
  const spaPath = spaEntry ?? "/index.html";

  const staleVersionCode = tagInvalidation ? `
    cleanStaleVersions();
    if (staleVersions.has(cacheKey(request))) {
      queueRefresh(cacheKey(request), new URL(request.url).href);
    }` : "";

  const tagCode = tagInvalidation ? `
  const tagsHeader = request.headers.get("X-SW-Cache-Tags");
  if (tagsHeader) {
    const cacheKeyUrl = cacheKey(request);
    const actualUrl = new URL(request.url).href;
    const tags = tagsHeader.split(",").map((t) => t.trim());
    await cacheTagUrl(cacheKeyUrl, actualUrl, tags);
  }` : "";

  const reactivePatterns = Object.entries(strategies)
    .filter(([, entry]) => {
      const resolved = typeof entry === "string" ? { strategy: entry } : entry;
      return resolved.strategy === "reactive";
    })
    .map(([pattern, entry]) => {
      const resolved = typeof entry === "string" ? { strategy: entry } : entry;
      return { pattern, staleTime: resolved.staleTime, refetchInterval: resolved.refetchInterval, refetchOnReconnect: resolved.refetchOnReconnect, refetchOnFocus: resolved.refetchOnFocus };
    });

  const trimDecl = `const GLOBAL_MAX_ENTRIES = ${maxCacheEntries ?? 0};
const GLOBAL_MAX_AGE = ${maxCacheAge ?? 0};
const REFETCH_BATCH_SIZE = ${refetchBatchSize};
const REFETCH_BATCH_DELAY_MS = ${refetchBatchDelayMs};`;

  return `${trimDecl}
// --- Batch Refresh Queue ---

const _refreshQueue = new Map();
let _refreshQueueProcessing = false;
let _refreshQueuePromise = null;

function queueRefresh(cacheKeyUrl, actualUrl) {
  // Use Map keyed by cacheKey for proper deduplication
  _refreshQueue.set(cacheKeyUrl, { cacheKey: cacheKeyUrl, actualUrl: actualUrl || cacheKeyUrl });
  if (!_refreshQueuePromise) {
    _refreshQueuePromise = _processRefreshQueue().finally(() => {
      _refreshQueuePromise = null;
      if (_refreshQueue.size > 0) queueRefresh();
    });
  }
  return _refreshQueuePromise;
}

function resolveActualUrl(entry) {
  const url = entry.actualUrl || entry.cacheKey;
  if (url.includes("/__swc/")) {
    // Virtual cache key — use the stored actual URL from tag registry
    return url;
  }
  return url;
}

async function _processRefreshQueue() {
  while (_refreshQueue.size > 0) {
    const batch = [];
    for (const [cacheKey, entry] of _refreshQueue) {
      if (batch.length >= REFETCH_BATCH_SIZE) break;
      batch.push(entry);
      _refreshQueue.delete(cacheKey);
    }
    if (batch.length === 0) break;

    const clients = await self.clients.matchAll();

    await Promise.allSettled(batch.map(async (entry) => {
      const fetchUrl = resolveActualUrl(entry);
      try {
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const request = new Request(entry.cacheKey);
          await storeRuntime(request, response);
          // Clean up stale version tracking on successful refresh
          if (typeof staleVersions !== "undefined" && staleVersions.has(entry.cacheKey)) {
            staleVersions.delete(entry.cacheKey);
          }
          for (const client of clients) {
            client.postMessage({ type: "CACHE_UPDATED", url: fetchUrl });
          }
        }
      } catch {
        // Refresh failed — stale cache remains usable
      }
    }));

    if (_refreshQueue.size > 0 && REFETCH_BATCH_DELAY_MS > 0) {
      await new Promise(r => setTimeout(r, REFETCH_BATCH_DELAY_MS));
    }
  }
  _refreshQueueProcessing = false;
}

// --- Reactive Patterns (extracted for interval/focus/reconnect) ---

const REACTIVE_PATTERNS = ${JSON.stringify(reactivePatterns)};

function findReactiveConfig(url) {
  const path = new URL(url).pathname;
  for (const cfg of REACTIVE_PATTERNS) {
    if (path.startsWith(cfg.pattern.replace("*", ""))) return cfg;
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
  const patternsWithInterval = reactivePatterns.filter((p): p is typeof p & { refetchInterval: number } => !!p.refetchInterval && p.refetchInterval > 0);
  if (patternsWithInterval.length === 0) return "";
  return `// Start intervals for reactive patterns with refetchInterval
(async () => {
${patternsWithInterval.map(p =>
  `  setInterval(async () => {
    const cache = await caches.open(CACHE_NAME_RUNTIME);
    const keys = await cache.keys();
    for (const request of keys) {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/__swc/")) continue;
      if (!url.pathname.startsWith("${p.pattern.replace("*", "")}")) continue;
      const config = findReactiveConfig(url.href);
      if (!config) continue;
      const cached = await cache.match(request);
      if (cached && shouldReactiveRefresh(cached, config)) {
        queueRefresh(request.url, url.href);
      }
    }
  }, ${p.refetchInterval * 1000});`
).join("\n")}
})();
`;})()
}
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
  normalizeCacheKey ? `
  // Sort query params alphabetically for consistent cache keys
  if (url.search) {
    const params = new URLSearchParams(url.search);
    params.sort();
    url.search = params.toString();
  }` : ""
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
        maxCacheEntries: resolved.maxCacheEntries ?? globalDefaults.maxCacheEntries,
        maxCacheAge: resolved.maxCacheAge ?? globalDefaults.maxCacheAge,
      };
    }
  }
  return {
    strategy: globalDefaults.defaultStrategy,
    maxCacheEntries: globalDefaults.maxCacheEntries,
    maxCacheAge: globalDefaults.maxCacheAge,
  };
}

function determineCacheStrategyForUrl(url, customStrategies, globalDefaults) {
  const path = new URL(url).pathname;
  for (const [pattern, entry] of Object.entries(customStrategies)) {
    if (path.startsWith(pattern.replace("*", ""))) {
      const resolved = resolveStrategyEntry(entry);
      return { strategy: resolved.strategy };
    }
  }
  return { strategy: globalDefaults.defaultStrategy };
}

function applyStrategy(event, request, config) {
  const { strategy, maxCacheEntries, maxCacheAge } = config;
  if (strategy === "reactive") {
    const reactiveCfg = findReactiveConfig(new URL(request.url).href);
    event.respondWith(reactiveStrategy(event, request, reactiveCfg?.staleTime, maxCacheEntries, maxCacheAge));
  } else if (strategy === "stale-while-revalidate") {
    event.respondWith(staleWhileRevalidate(event, request, maxCacheEntries, maxCacheAge));
  } else if (strategy === "network-first") {
    event.respondWith(networkFirst(event, request, maxCacheEntries, maxCacheAge));
  } else if (strategy === "cache-only") {
    event.respondWith(cacheOnly(event, request, maxCacheEntries, maxCacheAge));
  } else if (strategy === "network-only") {
    event.respondWith(networkOnly(event, request));
  } else {
    event.respondWith(cacheFirst(event, request, maxCacheEntries, maxCacheAge));
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (!request.headers.get("X-SW-Cache-Key")) return;
  }
  ${cacheStrategy === "explicit-only" ? `if (!request.headers.get("X-SW-Cache-Strategy")) return;` : ""}
  applyStrategy(event, request, determineCacheStrategy(event.request, ${JSON.stringify(strategies)}, { defaultStrategy: "${defaultStrategy}", maxCacheEntries: GLOBAL_MAX_ENTRIES, maxCacheAge: GLOBAL_MAX_AGE }));
});

// --- Strategies ---

${navigationPreload ? `
async function fetchWithPreload(event, request) {
  try {
    const preload = await event.preloadResponse;
    if (preload) return preload;
  } catch {}
  return fetch(request);
}
` : ""}const _fetch = ${navigationPreload ? "fetchWithPreload" : `(event, request) => fetch(request)`};

${generateTrimCode(maxCacheEntries, maxCacheAge)}
function _trim(cacheName, maxEntries, maxAge) {
${maxCacheEntries || maxCacheAge ? `  trimRuntimeCache(cacheName, maxEntries, maxAge);` : ""}
}

async function cacheFirst(event, request, maxEntries, maxAge) {
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
    event.waitUntil(
      (async () => {
        await cacheResponse(request, responseToCache);
        _trim(CACHE_NAME_RUNTIME, maxEntries, maxAge);
      })(),
    );
  }
  return response;
}

async function networkFirst(event, request, maxEntries, maxAge) {
  try {
    const response = await _fetch(event, request);
    if (response.ok) {
      const responseToCache = response.clone();
      event.waitUntil(
        (async () => {
          await cacheResponse(request, responseToCache);
          _trim(CACHE_NAME_RUNTIME, maxEntries, maxAge);
        })(),
      );
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

async function staleWhileRevalidate(event, request, maxEntries, maxAge) {
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
    _trim(CACHE_NAME_RUNTIME, maxEntries, maxAge);
  }
  return response;
}

async function reactiveStrategy(event, request, staleTime, maxEntries, maxAge) {
  const cached = await fromRuntime(request);
  if (cached) {${staleVersionCode}
    if (shouldReactiveRefresh(cached, { staleTime })) {
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
    _trim(CACHE_NAME_RUNTIME, maxEntries, maxAge);
  }
  return response;
}

async function cacheOnly(event, request, maxEntries, maxAge) {
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

function generateTrimCode(maxCacheEntries: number | undefined, maxCacheAge: number | undefined): string {
  if (!maxCacheEntries && !maxCacheAge) return "";

  return `
async function trimRuntimeCache(cacheName, maxEntries, maxAge) {
  const _maxEntries = maxEntries ?? GLOBAL_MAX_ENTRIES;
  const _maxAge = maxAge ?? GLOBAL_MAX_AGE;
  const cache = await caches.open(cacheName);

  if (_maxEntries > 0) {
    const keys = await cache.keys();
    if (keys.length >= _maxEntries) {
      const toDelete = keys.slice(0, keys.length - _maxEntries + 1);
      await Promise.all(toDelete.map((key) => cache.delete(key)));
    }
  }

  if (_maxAge > 0) {
    const keys = await cache.keys();
    const now = Date.now();
    for (const request of keys) {
      const response = await cache.match(request);
      const cachedAt = response?.headers.get("X-SW-Cached-At");
      if (cachedAt) {
        const age = now - Number(cachedAt);
        if (age > _maxAge) {
          await cache.delete(request);
        }
      }
    }
  }
}
`;
}
