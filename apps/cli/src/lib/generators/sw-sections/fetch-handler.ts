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
      normalizeKey?: boolean;
      ignoreQueryParams?: string[];
      timeout?: number;
    };
    navigation: {
      mode?: "spa" | "ssr" | "default";
      preload?: boolean;
      fallback?: string;
      rules?: Array<{ match: string; fallback?: string }>;
      retry?: { enabled: boolean; intervalMs?: number; maxRetries?: number };
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
  debug?: boolean,
): string {
  const {
    strategy: {
      default: defaultStrategy,
      patterns: strategies,
      normalizeKey: normalizeCacheKey,
      ignoreQueryParams,
      timeout: fetchTimeout = 10,
    },
    navigation: {
      mode: navMode = "spa",
      preload: navigationPreload,
      fallback: globalFallback = "",
      rules: navRules = [],
      retry: navRetry = { enabled: false },
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

  const debugMode = debug === true;
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

  const navModeCode = navMode === "ssr" ? "\"ssr\"" : navMode === "spa" ? "\"spa\"" : "\"default\"";
  const hasRules = navRules.length > 0;
  const fallbackCode = globalFallback ? `"${globalFallback}"` : '""';
  const navRulesCode = hasRules ? `const NAV_RULES = ${JSON.stringify(navRules.map((r) => ({
    match: r.match,
    ...(r.fallback ? { fallback: r.fallback } : {}),
  })), null, 2)};

function matchRouteFallback(url) {
  const path = new URL(url).pathname;
  for (const rule of NAV_RULES) {
    if (matchGlob(path, rule.match)) {
      return rule.fallback || null;
    }
  }
  return null;
}

` : "";

  const retryIntervalMs = navRetry.intervalMs ?? 5000;
  const retryMaxRetries = navRetry.maxRetries ?? 12;
  const retryEnabled = navRetry.enabled;

  const retryCode = `
const NAV_RETRY_ENABLED = ${retryEnabled};
const NAV_RETRY_INTERVAL_MS = ${retryIntervalMs};
const NAV_RETRY_MAX_RETRIES = ${retryMaxRetries};

// --- Smart Navigation Retry ---

function startRetryLoop(event, request) {
  swLog("startRetryLoop", "ENTER retry loop enabled=" + NAV_RETRY_ENABLED, request.url);
  if (!NAV_RETRY_ENABLED) return;
  let retries = 0;
  const retry = async () => {
    swLog("startRetryLoop/retry", "attempt=" + (retries + 1) + "/" + NAV_RETRY_MAX_RETRIES, request.url);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const response = await fetch(request.clone(), { signal: controller.signal });
      clearTimeout(id);
      if (response.ok) {
        swLog("startRetryLoop/retry", "SUCCESS", request.url);
        await storeRuntime(request.clone(), response.clone());
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({
            type: "NAV_RETRY_SUCCESS",
            url: request.url,
          });
        }
        return;
      }
    } catch {
      swLog("startRetryLoop/retry", "CATCH fetch failed", request.url);
    }
    retries++;
    if (retries < NAV_RETRY_MAX_RETRIES) {
      const delay = NAV_RETRY_INTERVAL_MS * Math.pow(2, retries - 1);
      swLog("startRetryLoop/retry", "schedule retry in " + Math.min(delay, 30000) + "ms", request.url);
      setTimeout(retry, Math.min(delay, 30000));
    } else {
      swLog("startRetryLoop/retry", "exhausted retries", request.url);
    }
  };
  setTimeout(retry, NAV_RETRY_INTERVAL_MS);
}
`;

  return `const NAV_MODE = ${navModeCode};

const FALLBACK_PATH = ${fallbackCode};

${navRulesCode}${retryCode}${trimDecl}
// --- Debug Logging ---

const SW_DEBUG = ${debugMode};
function swLog(fn, msg, url) {
  if (!SW_DEBUG) return;
  console.log("[SW][" + fn + "]", msg, url || "", Date.now());
}

// --- Batch Refresh Queue ---

const _refreshQueue = new Map();
let _refreshQueuePromise = null;

function queueRefresh(cacheKeyUrl, actualUrl${
    tagInvalidation ? ", tags" : ""
  }${
    tagInvalidation ? ", method, body, contentType" : ""
  }) {
  // Use Map keyed by cacheKey for proper deduplication${
    tagInvalidation
      ? `
  // Don't let a tagless (SWR/reactive) refresh override an invalidation-triggered entry with tags
  if (_refreshQueue.has(cacheKeyUrl) && !tags) return;`
      : ""
  }
  _refreshQueue.set(cacheKeyUrl, { cacheKey: cacheKeyUrl, actualUrl: actualUrl || cacheKeyUrl, retryCount: 0${
    tagInvalidation ? ", tags: tags || null, method: method || null, body: body || null, contentType: contentType || null" : ""
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
          const fetchOpts = {};
          if (entry.method && entry.method !== "GET" && entry.method !== "HEAD") {
            fetchOpts.method = entry.method;
            if (entry.body) fetchOpts.body = entry.body;
            if (entry.contentType) fetchOpts.headers = { "Content-Type": entry.contentType };
          }
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
          fetchOpts.signal = controller.signal;
          const response = await fetch(fetchUrl, fetchOpts);
          clearTimeout(id);
          if (response.ok) {
            const request = new Request(entry.cacheKey);
            await storeRuntime(request, response);${
              tagInvalidation
                ? `
          if (entry.tags && typeof cacheTagUrl !== "undefined") {
            await cacheTagUrl(entry.cacheKey, fetchUrl, entry.tags, entry.method, entry.body, entry.contentType);
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
          } else if (response.status === 401) {
            // Auth failure during background refetch — notify clients so they can check auth.
            // Don't delete the cached entry — the stale response is better than no response,
            // and the user may re-authenticate.
            if (typeof staleVersions !== "undefined" && staleVersions.has(entry.cacheKey)) {
              staleVersions.delete(entry.cacheKey);
            }
            for (const client of clients) {
              client.postMessage({ type: "AUTH_FAILURE", detail: { url: fetchUrl } });
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

const GLOBAL_REACTIVE_DEFAULTS = ${JSON.stringify(reactGlobalDefaults)};

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

// --- Reactive Entry Registry ---
// Tracks reactive entries to avoid full cache scans on interval/focus/reconnect.

const _reactiveRegistry = new Map();

function isEntryStale(entry) {
  if (!entry.staleTime && entry.staleTime !== 0) return true;
  if (entry.staleTime === 0) return true;
  return Date.now() - entry.cachedAt > entry.staleTime * 1000;
}

function registerReactiveEntry(cacheKey, actualUrl) {
  const config = findReactiveConfig(actualUrl);
  if (!config) return;
  const existing = _reactiveRegistry.get(cacheKey);
  if (existing) {
    existing.cachedAt = Date.now();
    return;
  }
  const entry = {
    url: actualUrl,
    cachedAt: Date.now(),
    staleTime: config.staleTime,
    refetchInterval: config.refetchInterval,
    refetchOnFocus: config.refetchOnFocus,
    refetchOnReconnect: config.refetchOnReconnect,
  };
  _reactiveRegistry.set(cacheKey, entry);
  if (entry.refetchInterval && entry.refetchInterval > 0) {
    scheduleEntryRefresh(cacheKey, entry);
  }
}

function unregisterReactiveEntry(cacheKey) {
  const entry = _reactiveRegistry.get(cacheKey);
  if (entry && entry._timer) {
    clearTimeout(entry._timer);
  }
  _reactiveRegistry.delete(cacheKey);
}

function scheduleEntryRefresh(cacheKey, entry) {
  if (!entry.refetchInterval || entry.refetchInterval <= 0) return;
  const delay = Math.max(entry.refetchInterval * 1000 - (Date.now() - entry.cachedAt), 0);
  entry._timer = setTimeout(async () => {
    if (!_reactiveRegistry.has(cacheKey)) return;
    if (isEntryStale(entry)) {
      queueRefresh(cacheKey, entry.url);
    }
    entry.cachedAt = Date.now();
    scheduleEntryRefresh(cacheKey, entry);
  }, delay);
}

// Scan existing cache entries once to populate the registry
(async () => {
  for (const name of [CACHE_NAME_RUNTIME, CACHE_NAME_RUNTIME_HTML]) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    for (const request of keys) {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/__swc/")) continue;
      const config = findReactiveConfig(url.href);
      if (!config) continue;
      const cached = await cache.match(request);
      if (!cached) continue;
      const key = request.url;
      const entry = {
        url: url.href,
        cachedAt: Number(cached.headers.get("X-SW-Cached-At")) || Date.now(),
        staleTime: config.staleTime,
        refetchInterval: config.refetchInterval,
        refetchOnFocus: config.refetchOnFocus,
        refetchOnReconnect: config.refetchOnReconnect,
      };
      _reactiveRegistry.set(key, entry);
      if (entry.refetchInterval && entry.refetchInterval > 0) {
        scheduleEntryRefresh(key, entry);
      }
    }
  }
})();

async function handleOnline() {
  const clients = await self.clients.matchAll();
  if (clients.length === 0) return;

  if (typeof staleVersions !== "undefined") {
    const staleUrls = [...staleVersions.keys()];
    for (const url of staleUrls) {
      queueRefresh(url, url);
    }
  }

  for (const [cacheKey, entry] of _reactiveRegistry) {
    if (!entry.refetchOnReconnect) continue;
    for (const name of [CACHE_NAME_RUNTIME, CACHE_NAME_RUNTIME_HTML]) {
      const cache = await caches.open(name);
      const cached = await cache.match(cacheKey);
      if (cached && shouldReactiveRefresh(cached, { staleTime: entry.staleTime })) {
        queueRefresh(cacheKey, entry.url);
        break;
      }
    }
  }
}

async function handleOnFocus() {
  for (const [cacheKey, entry] of _reactiveRegistry) {
    if (!entry.refetchOnFocus) continue;
    for (const name of [CACHE_NAME_RUNTIME, CACHE_NAME_RUNTIME_HTML]) {
      const cache = await caches.open(name);
      const cached = await cache.match(cacheKey);
      if (cached && shouldReactiveRefresh(cached, { staleTime: entry.staleTime })) {
        queueRefresh(cacheKey, entry.url);
        break;
      }
    }
  }
}

// --- Cache Key ---

function cacheKey(request) {
  swLog("cacheKey", "ENTER", request.url);
  const key = request.headers.get("X-SW-Cache-Key");
  if (key) { swLog("cacheKey", "header key=" + key); return new URL("/__swc/" + key, self.location.origin).href; }
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
  swLog("fromPrecache", "ENTER", request.url);
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  url.search = "";
  const match = await cache.match(url.href);
  swLog("fromPrecache", match ? "HIT" : "MISS", request.url);
  return match;
}

async function fromRuntime(request) {
  swLog("fromRuntime", "ENTER", request.url);
  const cache = await caches.open(CACHE_NAME_RUNTIME);
  const match = await cache.match(cacheKey(request));
  swLog("fromRuntime", match ? "HIT" : "MISS", request.url);
  return match;
}

async function handleSpaNavigation(event, request) {
  swLog("handleSpaNavigation", "ENTER FALLBACK_PATH=" + FALLBACK_PATH, request.url);
  if (FALLBACK_PATH) {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(FALLBACK_PATH);
    if (match) {
      swLog("handleSpaNavigation", "global fallback HIT", request.url);
      const clients = await self.clients.matchAll();
      for (const client of clients) {
        client.postMessage({
          type: "OFFLINE_FALLBACK_ACTIVATED",
          detail: { route: new URL(request.url).pathname, fallbackLevel: "offline-page", timestamp: Date.now() },
        });
      }
      return match;
    }
    swLog("handleSpaNavigation", "global fallback MISS", request.url);
  }${hasRules ? `
  const routeFallbackPath = matchRouteFallback(request.url);
  if (routeFallbackPath) {
    swLog("handleSpaNavigation", "route fallback path=" + routeFallbackPath, request.url);
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(routeFallbackPath);
    if (match) {
      swLog("handleSpaNavigation", "route fallback HIT", request.url);
      const clients = await self.clients.matchAll();
      for (const client of clients) {
        client.postMessage({
          type: "OFFLINE_FALLBACK_ACTIVATED",
          detail: { route: new URL(request.url).pathname, fallbackLevel: "route-fallback", timestamp: Date.now() },
        });
      }
      return match;
    }
    swLog("handleSpaNavigation", "route fallback MISS", request.url);
  }` : ""}
  swLog("handleSpaNavigation", "returning inline 503", request.url);
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({
      type: "OFFLINE_FALLBACK_ACTIVATED",
      detail: { route: new URL(request.url).pathname, fallbackLevel: "inline-503", timestamp: Date.now() },
    });
  }
  return inline503Response();
}

async function serveFromCache(event, request) {
  swLog("serveFromCache", "ENTER mode=" + request.mode + " NAV_MODE=" + NAV_MODE, request.url);
  if (request.mode === "navigate") {
    if (NAV_MODE === "spa") {
      swLog("serveFromCache", "SPA navigation", request.url);
      return handleSpaNavigation(event, request);
    }
    swLog("serveFromCache", "SSR/SSG navigation, checking precache", request.url);
    const pc = await caches.open(CACHE_NAME);
    const pUrl = new URL(request.url);
    pUrl.search = "";
    const precached = await pc.match(pUrl.href);
    if (precached) { swLog("serveFromCache", "precache HIT", request.url); return precached; }
    swLog("serveFromCache", "precache MISS, checking HTML runtime", request.url);
    const htmlCache = await caches.open(CACHE_NAME_RUNTIME_HTML);
    return htmlCache.match(cacheKey(request));
  }
  const cached = await fromRuntime(request);
  if (cached) { swLog("serveFromCache", "runtime HIT", request.url); return cached; }
  swLog("serveFromCache", "runtime MISS, checking precache", request.url);
  return fromPrecache(request);
}

async function storeRuntime(request, response) {
  swLog("storeRuntime", "ENTER", request.url);
  if (request.mode === "navigate" && NAV_MODE === "spa") { swLog("storeRuntime", "skip SPA nav"); return; }
  const key = cacheKey(request);
  const precache = await caches.open(CACHE_NAME);
  const checkUrl = new URL(key);
  checkUrl.search = "";
  if (await precache.match(checkUrl.href)) { swLog("storeRuntime", "skip already in precache", key); return; }
  const ct = response.headers.get("Content-Type") || "";
  const cacheName = ct.startsWith("text/html") ? CACHE_NAME_RUNTIME_HTML : CACHE_NAME_RUNTIME;
  const cache = await caches.open(cacheName);
  const headers = new Headers(response.headers);
  headers.set("X-SW-Cached-At", String(Date.now()));
  const cloned = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(key, cloned);
  swLog("storeRuntime", "stored in " + cacheName, key);
  const actualUrl = new URL(request.url).href;
  if (findReactiveConfig(actualUrl)) {
    registerReactiveEntry(key, actualUrl);
  }
}

async function cacheResponse(request, response) {
  if (request.mode === "navigate" && NAV_MODE === "spa") return;
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

function inline503Response() {
  swLog("inline503Response", "ENTER", "");
  return new Response(
    \`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Offline</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}div{text-align:center}h1{font-size:2rem;color:#333}p{color:#666}</style></head><body><div><h1>You're offline</h1><p>Please check your connection and try again.</p></div></body></html>\`,
    { status: 503, headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } }
  );
}

async function fromUltimateFallback(event, request) {
  swLog("fromUltimateFallback", "ENTER retryEnabled=" + NAV_RETRY_ENABLED, request.url);
  const isNav = request.mode === "navigate";

  if (isNav && NAV_RETRY_ENABLED) {
    swLog("fromUltimateFallback", "starting retry loop", request.url);
    event.waitUntil(startRetryLoop(event, request));
  }

  ${hasRules ? `
  swLog("fromUltimateFallback", "checking route fallback", request.url);
  const routeFallbackPath = matchRouteFallback(request.url);
  if (routeFallbackPath) {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(routeFallbackPath);
    if (match) {
      swLog("fromUltimateFallback", "route fallback HIT", request.url);
      const clients = await self.clients.matchAll();
      for (const client of clients) {
        client.postMessage({
          type: "OFFLINE_FALLBACK_ACTIVATED",
          detail: { route: new URL(request.url).pathname, fallbackLevel: "route-fallback", timestamp: Date.now() },
        });
      }
      return match;
    }
    swLog("fromUltimateFallback", "route fallback MISS", request.url);
  }` : ""}
  if (FALLBACK_PATH) {
    swLog("fromUltimateFallback", "checking global fallback", request.url);
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(FALLBACK_PATH);
    if (match) {
      swLog("fromUltimateFallback", "global fallback HIT", request.url);
      const clients = await self.clients.matchAll();
      for (const client of clients) {
        client.postMessage({
          type: "OFFLINE_FALLBACK_ACTIVATED",
          detail: { route: new URL(request.url).pathname, fallbackLevel: "offline-page", timestamp: Date.now() },
        });
      }
      return match;
    }
    swLog("fromUltimateFallback", "global fallback MISS", request.url);
  }
  swLog("fromUltimateFallback", "returning inline 503", request.url);
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({
      type: "OFFLINE_FALLBACK_ACTIVATED",
      detail: { route: new URL(request.url).pathname, fallbackLevel: "inline-503", timestamp: Date.now() },
    });
  }
  return inline503Response();
}

// Navigation modes are handled at serve-from-cache time via serveFromCache.
// - spa:     client-routed, fallback directly (no URL check)
// - ssr:     server-rendered, precache + runtime HTML by URL
// - default: SSG, precache + runtime HTML by URL

// --- Response Helpers ---

function markFromCache(response) {
  swLog("markFromCache", "ENTER url=" + (response.url || "(no url)"), "");
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
    swLog("determineCacheStrategy", "header override=" + override, request.url);
    return { strategy: override };
  }
  const path = new URL(request.url).pathname;
  for (const [pattern, entry] of Object.entries(customStrategies)) {
    if (matchGlob(path, pattern)) {
      const resolved = resolveStrategyEntry(entry);
      const cfg = { strategy: resolved.strategy };
      if (resolved.strategy === "reactive") {
        const reactive = findReactiveConfig(new URL(request.url).href);
        if (reactive) {
          cfg.staleTime = reactive.staleTime;
          cfg.refetchOnFocus = reactive.refetchOnFocus;
          cfg.refetchOnReconnect = reactive.refetchOnReconnect;
        }
      }
      swLog("determineCacheStrategy", "custom rule matched pattern=" + pattern + " strategy=" + resolved.strategy, request.url);
      return cfg;
    }
  }
  const cfg = { strategy: globalDefaults.defaultStrategy };
  if (globalDefaults.defaultStrategy === "reactive") {
    cfg.staleTime = GLOBAL_REACTIVE_DEFAULTS.staleTime;
    cfg.refetchOnFocus = GLOBAL_REACTIVE_DEFAULTS.refetchOnFocus;
    cfg.refetchOnReconnect = GLOBAL_REACTIVE_DEFAULTS.refetchOnReconnect;
  }
  swLog("determineCacheStrategy", "default strategy=" + cfg.strategy, request.url);
  return cfg;
}

async function _executeStrategy(event, request, config) {
  swLog("_executeStrategy", "entering strategy=" + config.strategy, request.url);
  try {
    const { strategy } = config;
    if (strategy === "reactive") {
      return await reactiveStrategy(event, request, config.staleTime);
    } else if (strategy === "stale-while-revalidate") {
      return await staleWhileRevalidate(event, request);
    } else if (strategy === "network-first") {
      return await networkFirst(event, request);
    } else if (strategy === "cache-only") {
      return await cacheOnly(event, request);
    } else if (strategy === "network-only") {
      return await networkOnly(event, request);
    } else {
      return await cacheFirst(event, request);
    }
  } catch {
    swLog("_executeStrategy", "CATCH -> fromUltimateFallback", request.url);
    return fromUltimateFallback(event, request);
  }
}

function applyStrategy(event, request, config) {
  swLog("applyStrategy", "strategy=" + config.strategy, request.url);
  event.respondWith(_executeStrategy(event, request, config));
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

function _fetchWithTimeout(request) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(id));
}

async function handleMutation(event) {
  const request = event.request;
  swLog("handleMutation", "ENTER noQueue=" + (request.headers.get("X-SW-No-Queue") === "true"), request.url);
  if (request.headers.get("X-SW-No-Queue") === "true") {
    try {
      return await _fetchWithTimeout(request.clone());
    } catch {
      throw new Error("Mutation failed (no-queue mode)");
    }
  }
  try {
    return await _fetchWithTimeout(request.clone());
  } catch {
    swLog("handleMutation", "fetch failed, queueing mutation", request.url);
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
  const { request } = event;
  swLog("fetch", "INCOMING", request.url);
  swLog("fetch", "method=" + request.method + " mode=" + request.mode + " destination=" + request.destination + " online=" + navigator.onLine);${
    mutationQueueEnabled
      ? `
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (request.headers.get("X-SW-Cache-Strategy") === "mutation") {
      swLog("fetch", "ROUTE mutation handler", request.url);
      event.respondWith(handleMutation(event));
      return;
    }
    if (!request.headers.get("X-SW-Cache-Key")) { swLog("fetch", "SKIP no cache key", request.url); return; }
  }`
      : `
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (!request.headers.get("X-SW-Cache-Key")) { swLog("fetch", "SKIP no cache key non-GET", request.url); return; }
  }`
  }
  const strat = determineCacheStrategy(event.request, ${JSON.stringify(strategies)}, { defaultStrategy: "${defaultStrategy}" });
  swLog("fetch", "strategy=" + strat.strategy, request.url);
  applyStrategy(event, request, strat);
});

// --- Strategies ---

const FETCH_TIMEOUT_MS = ${fetchTimeout * 1000};

// --- ETag Conditional Fetch ---
// Transparently handles If-None-Match/304 so strategies always see a 200 response.

async function _fetchWithConditional(request) {
  swLog("_fetchWithConditional", "ENTER timeout=" + FETCH_TIMEOUT_MS, request.url);
  let cached;
  if (!(request.mode === "navigate" && NAV_MODE === "spa")) {
    const cache = await caches.open(CACHE_NAME_RUNTIME);
    cached = await cache.match(cacheKey(request));
    if (!cached && request.mode === "navigate") {
      const htmlCache = await caches.open(CACHE_NAME_RUNTIME_HTML);
      cached = await htmlCache.match(cacheKey(request));
    }
  }
  swLog("_fetchWithConditional", "cached=" + !!cached + " etag=" + (cached?.headers.get("ETag") || "none"), request.url);
  const etag = cached?.headers.get("ETag");
  if (etag) {
    request = new Request(request, {
      headers: Object.assign(Object.fromEntries(request.headers.entries()), { "If-None-Match": etag }),
    });
  }
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    swLog("_fetchWithConditional", "BEFORE fetch", request.url);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(id);
    swLog("_fetchWithConditional", "AFTER fetch status=" + response.status, request.url);
    if (response.status === 304 && cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-SW-Cached-At", String(Date.now()));
      swLog("_fetchWithConditional", "304 -> returning cached", request.url);
      return new Response(cached.body, {
        status: 200,
        statusText: cached.statusText,
        headers,
      });
    }
    return response;
  } catch {
    swLog("_fetchWithConditional", "CATCH fetch failed", request.url);
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        type: "SW_NOTIFICATION",
        level: "error",
        code: "FETCH_FAILED",
        message: "Network request failed: " + request.url,
      });
    }
    throw new Error("Network request failed: " + request.url);
  }
}

${
  navigationPreload
    ? `
async function fetchWithPreload(event, request) {
  swLog("fetchWithPreload", "ENTER", request.url);
  try {
    swLog("fetchWithPreload", "BEFORE await preloadResponse", request.url);
    const preload = await event.preloadResponse;
    swLog("fetchWithPreload", "AFTER await preloadResponse preload=" + !!preload, request.url);
    if (preload) return preload;
  } catch (err) {
    swLog("fetchWithPreload", "CATCH preloadResponse err", request.url);
  }
  swLog("fetchWithPreload", "fallback to _fetchWithConditional", request.url);
  return _fetchWithConditional(request);
}
`
    : ""
}const _fetch = ${navigationPreload ? "fetchWithPreload" : "_fetchWithConditional"};

async function cacheFirst(event, request) {
  swLog("cacheFirst", "ENTER", request.url);
  const cached = await serveFromCache(event, request);
  if (cached) {${staleVersionCode}
    swLog("cacheFirst", "cache HIT", request.url);
    return markFromCache(cached);
  }
  swLog("cacheFirst", "cache MISS, fetching", request.url);
  const response = await _fetch(event, request);
  if (response && response.ok) {
    const responseToCache = response.clone();
    event.waitUntil(cacheResponse(request.clone(), responseToCache));
  }
  return response;
}

async function networkFirst(event, request) {
  swLog("networkFirst", "ENTER", request.url);
  try {
    const reqForCache = request.clone();
    const response = await _fetch(event, request);
    swLog("networkFirst", "fetch done status=" + response.status, request.url);
    if (response.ok) {
      const responseToCache = response.clone();
      event.waitUntil(cacheResponse(reqForCache, responseToCache));
    }
    return response;
  } catch {
    swLog("networkFirst", "CATCH, trying cache", request.url);
    const cached = await serveFromCache(event, request);
    if (cached) {
      swLog("networkFirst", "cache HIT", request.url);
      return markFromCache(cached);
    }
    swLog("networkFirst", "cache MISS -> ultimate fallback", request.url);
    throw new Error("Network request failed and no cached response available");
  }
}

async function staleWhileRevalidate(event, request) {
  swLog("staleWhileRevalidate", "ENTER", request.url);
  const cached = await serveFromCache(event, request);
  if (cached) {
    swLog("staleWhileRevalidate", "cache HIT, queueing refresh", request.url);
    event.waitUntil(queueRefresh(cacheKey(request), new URL(request.url).href));
    return markFromCache(cached);
  }
  swLog("staleWhileRevalidate", "cache MISS, fetching", request.url);
  const reqForCache = request.clone();
  const response = await _fetch(event, request);
  if (response.ok) {
    const responseToCache = response.clone();
    await cacheResponse(reqForCache, responseToCache);
  }
  return response;
}

async function reactiveStrategy(event, request, staleTime) {
  swLog("reactiveStrategy", "ENTER staleTime=" + staleTime, request.url);
  const headerStale = request.headers.get("X-SW-Stale-Time");
  const effectiveStaleTime = headerStale !== null ? Number(headerStale) : staleTime;
  const cached = await serveFromCache(event, request);
  if (cached) {${staleVersionCode}
    if (shouldReactiveRefresh(cached, { staleTime: effectiveStaleTime })) {
      swLog("reactiveStrategy", "stale, queueing refresh", request.url);
      event.waitUntil(queueRefresh(cacheKey(request), new URL(request.url).href));
    }
    return markFromCache(cached);
  }
  swLog("reactiveStrategy", "cache MISS, fetching", request.url);
  const reqForCache = request.clone();
  const response = await _fetch(event, request);
  if (response.ok) {
    const responseToCache = response.clone();
    await cacheResponse(reqForCache, responseToCache);
  }
  return response;
}

async function cacheOnly(event, request) {
  swLog("cacheOnly", "ENTER", request.url);
  const cached = await serveFromCache(event, request);
  if (cached) {${staleVersionCode}
    return markFromCache(cached);
  }
  swLog("cacheOnly", "MISS -> 404", request.url);
  return new Response("Not in cache", { status: 404 });
}

async function networkOnly(event, request) {
  swLog("networkOnly", "ENTER", request.url);
  return _fetch(event, request);
}`;
}
