export function generateFetchHandler(
  swConfig: {
    strategy: {
      default: string;
      patterns: Record<
        string,
        | string
        | {
            strategy: string;
            timeout?: number;
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
      maxRuntimeCacheAge?: number;
    };
    navigation: {
      mode?: "spa" | "ssr" | "default";
      preload?: boolean;
      fallback?: string;
      rules?: Array<{ match: string; fallback?: string }>;
    };
    refetchQueue: {
      retry: {
        maxRetries: number;
        backoffMs: number;
        maxBackoffMs: number;
        jitterMs: number;
      };
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
      maxRuntimeCacheAge: maxCacheAge,
    },
    navigation: {
      mode: navMode = "spa",
      preload: navigationPreload,
      fallback: globalFallback = "",
      rules: navRules = [],
    },
  } = swConfig;

  const debugMode = debug === true;
  const globalStaleTime = swConfig.strategy.reactive?.defaults?.staleTime;
  const refetchRetry = swConfig.refetchQueue.retry;

  const hasRules = navRules.length > 0;
  const navModeCode =
    navMode === "ssr" ? '"ssr"' : navMode === "spa" ? '"spa"' : '"default"';
  const fallbackCode = globalFallback ? `"${globalFallback}"` : '""';

  const navRulesCode = hasRules
    ? `const NAV_RULES = ${JSON.stringify(
        navRules.map((r) => ({
          match: r.match,
          ...(r.fallback ? { fallback: r.fallback } : {}),
        })),
        null,
        2,
      )};

function matchRouteFallback(url) {
  swLog("matchRouteFallback", "ENTER", url, 4);
  const path = new URL(url).pathname;
  for (const rule of NAV_RULES) {
    if (matchGlob(path, rule.match)) {
      swLog("matchRouteFallback", "MATCH rule=" + rule.match + " fallback=" + (rule.fallback || "null"), url, 4);
      return rule.fallback || null;
    }
  }
  swLog("matchRouteFallback", "NO MATCH", url, 4);
  return null;
}

`
    : "";

  const globCode =
    "\n" +
    "// --- Glob Pattern Matching ---\n" +
    "\n" +
    "function escapeGlobMeta(s) {\n" +
    '  return s.replace(/[.+^${}()|[\\]\\\\]/g, "\\\\$&");\n' +
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

  const inline503 =
    "function inline503Response() {\n" +
    "  return new Response(\n" +
    '    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Offline</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}div{text-align:center}h1{font-size:2rem;color:#333}p{color:#666}</style></head><body><div><h1>You\\\'re offline</h1><p>Please check your connection and try again.</p></div></body></html>`,\n' +
    '    { status: 503, headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } }\n' +
    "  );\n" +
    "}\n";

  const tagCode = tagInvalidation
    ? `
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
      try { body = await request.clone().text(); } catch {}
    }
    await cacheTagUrl(cacheKeyUrl, actualUrl, tags, method, body, contentType);
  }`
    : "";

  const refetchRetryCode = JSON.stringify(refetchRetry);

  return `// --- Mode & Strategy Configuration ---

const NAV_MODE = ${navModeCode};
const FALLBACK_PATH = ${fallbackCode};
const DEFAULT_STRATEGY = "${defaultStrategy}";
const CUSTOM_STRATEGIES = ${JSON.stringify(strategies)};
const REACTIVE_STALE_DEFAULT = ${globalStaleTime != null ? globalStaleTime : 0};
const FETCH_TIMEOUT_MS = ${fetchTimeout * 1000};
const REFETCH_RETRY = ${refetchRetryCode};
const SW_DEBUG = ${debugMode};

${navRulesCode}// --- Debug Logging ---

function swLog(fn, msg, url, indent) {
  if (!SW_DEBUG) return;
  var prefix = "";
  for (var i = 0; i < (indent || 0); i++) prefix += "  ";
  console.log("[SW]" + prefix, fn + ":", msg, url || "", Date.now());
}

${globCode}// --- Navigation Detection ---

function isNavRequest(request) {
  return (
    request.mode === "navigate" ||
    request.destination === "document" ||
    (request.method === "GET" &&
      request.headers.get("sec-fetch-mode") === "navigate")
  );
}

// --- Cache Key ---

function cacheKey(request) {
  const key = request.headers.get("X-SW-Cache-Key");
  if (key) return new URL("/__swc/" + key, self.location.origin).href;
  const url = new URL(request.url);${
    normalizeCacheKey
      ? `
  if (url.search) {
    const params = new URLSearchParams(url.search);
    params.sort();
    url.search = params.toString();
  }`
      : ""
  }${
    ignoreQueryParams && ignoreQueryParams.length > 0
      ? `
  if (url.search) {
    const params = new URLSearchParams(url.search);
    const ignore = ${JSON.stringify(ignoreQueryParams)};
    for (const key of ignore) params.delete(key);
    url.search = params.toString();
  }`
      : ""
  }
  return url.href;
}

// --- Cache Lookup ---

async function fromPrecache(request) {
  swLog("fromPrecache", "ENTER", request.url, 4);
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  url.search = "";
  const result = await cache.match(url.href);
  swLog("fromPrecache", result ? "HIT" : "MISS", request.url, 4);
  return result;
}

async function fromRuntime(request) {
  swLog("fromRuntime", "ENTER", request.url, 4);
  const cache = await caches.open(CACHE_NAME_RUNTIME);
  const result = await cache.match(cacheKey(request));
  swLog("fromRuntime", result ? "HIT" : "MISS", request.url, 4);
  return result;
}

/*
 * serveFromCache returns a cached Response, or null if nothing is cached.
 *
 * Mode-specific behaviour for navigation requests:
 *   SPA:      bypass cache entirely → return null
 *   SSR:      precache → runtime-html → null
 *   Default:  same as SSR
 *
 * Non-navigation requests:
 *   runtime → precache → null
 */
async function serveFromCache(request) {
  swLog("serveFromCache", "ENTER", request.url, 3);
  if (isNavRequest(request)) {
    if (NAV_MODE === "spa") {
      if (FALLBACK_PATH) {
        const cache = await caches.open(CACHE_NAME);
        const match = await cache.match(FALLBACK_PATH);
        if (match) {
          swLog("serveFromCache", "HIT fallback-path", request.url, 3);
          return match;
        }
      }
      swLog("serveFromCache", "MISS (SPA nav)", request.url, 3);
      return null;
    }
    const pc = await fromPrecache(request);
    if (pc) {
      swLog("serveFromCache", "HIT precache (nav)", request.url, 3);
      return pc;
    }
    const htmlCache = await caches.open(CACHE_NAME_RUNTIME_HTML);
    const htmlMatch = await htmlCache.match(cacheKey(request));
    if (htmlMatch) {
      swLog("serveFromCache", "HIT runtime-html", request.url, 3);
      return htmlMatch;
    }
    swLog("serveFromCache", "MISS (SSR/Default nav)", request.url, 3);
    return null;
  }
  const cached = await fromRuntime(request);
  if (cached) {
    swLog("serveFromCache", "HIT runtime", request.url, 3);
    return cached;
  }
  const pc = await fromPrecache(request);
  if (pc) {
    swLog("serveFromCache", "HIT precache (sub)", request.url, 3);
    return pc;
  }
  swLog("serveFromCache", "MISS (subresource)", request.url, 3);
  return null;
}

// --- Cache Store ---

/*
 * cacheResponse stores a network response in the appropriate cache.
 *
 * If already in precache:
 *   - non-HTML with same content-type → update precache entry
 *   - otherwise → skip (no runtime duplicate)
 * If not in precache:
 *   - HTML → runtime-html cache
 *   - non-HTML → runtime cache
 *
 * Tags are recorded in all cases.
 */
async function cacheResponse(response, request) {
  swLog("cacheResponse", "ENTER", request.url, 3);
  const key = cacheKey(request);
  const ct = response.headers.get("Content-Type") || "";
  var skipRuntime = false;
  const precache = await caches.open(CACHE_NAME);
  const url = new URL(key);
  url.search = "";
  const precached = await precache.match(url.href);

  if (precached) {
    if (!ct.startsWith("text/html")) {
      const pct = precached.headers.get("Content-Type") || "";
      if (pct.split(";")[0] === ct.split(";")[0]) {
        await precache.put(url.href, response.clone());
        swLog("cacheResponse", "updated precache", request.url, 3);
      }
    }
    skipRuntime = true;
  }

  if (!skipRuntime) {
    const cacheName = ct.startsWith("text/html") ? CACHE_NAME_RUNTIME_HTML : CACHE_NAME_RUNTIME;
    const cache = await caches.open(cacheName);
    const headers = new Headers(response.headers);
    headers.set("X-SW-Cached-At", String(Date.now()));
    await cache.put(key, new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }));
    swLog("cacheResponse", "stored in " + cacheName, request.url, 3);
  }${tagCode}
}

// --- Fallback ---

/*
 * Fallback hierarchy for when a strategy cannot serve a response:
 *   SSR / Default:  per-route → global fallback → inline 503
 *   SPA:            per-route → inline 503
 */
async function fallback(request) {
  swLog("fallback", "ENTER", request.url, 3);${
    hasRules
      ? `
    const routeFallbackPath = matchRouteFallback(request.url);
    if (routeFallbackPath) {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(routeFallbackPath);
      if (match) {
        swLog("fallback", "HIT per-route fallback", request.url, 3);
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({
            type: "OFFLINE_FALLBACK_ACTIVATED",
            detail: { route: new URL(request.url).pathname, fallbackLevel: "route-fallback", timestamp: Date.now() },
          });
        }
        return match;
      }
    }`
      : ""
  }
  if (NAV_MODE !== "spa") {
    if (FALLBACK_PATH) {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(FALLBACK_PATH);
      if (match) {
        swLog("fallback", "HIT global fallback", request.url, 3);
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({
            type: "OFFLINE_FALLBACK_ACTIVATED",
            detail: { route: new URL(request.url).pathname, fallbackLevel: "offline-page", timestamp: Date.now() },
          });
        }
        return match;
      }
    }
  }
  swLog("fallback", "HIT inline 503", request.url, 3);
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({
      type: "OFFLINE_FALLBACK_ACTIVATED",
      detail: { route: new URL(request.url).pathname, fallbackLevel: "inline-503", timestamp: Date.now() },
    });
  }
  return inline503Response();
}

${inline503}// --- Response Helpers ---

function markFromCache(response) {
  swLog("markFromCache", "ENTER", response.url, 4);
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

// --- Backoff, Sleep & Retry Helpers ---

function backoffDelay(attempt, config) {
  const delay = Math.min(config.backoffMs * Math.pow(2, attempt), config.maxBackoffMs);
  return delay + (config.jitterMs > 0 ? Math.random() * config.jitterMs : 0);
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function fetchWithRetry(request, retryConfig) {
  swLog("fetchWithRetry", "ENTER", request.url, 3);
  if (!retryConfig) return fetch(request);
  for (var attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      var controller = new AbortController();
      var id = setTimeout(function() { controller.abort(); }, FETCH_TIMEOUT_MS);
      var response = await fetch(request, { signal: controller.signal });
      clearTimeout(id);
      if (response.ok) {
        swLog("fetchWithRetry", "SUCCESS attempt=" + attempt, request.url, 3);
        return response;
      }
    } catch {}
    swLog("fetchWithRetry", "RETRY attempt=" + attempt, request.url, 3);
    if (attempt < retryConfig.maxRetries) {
      await sleep(backoffDelay(attempt, retryConfig));
    }
  }
  swLog("fetchWithRetry", "EXHAUSTED", request.url, 3);
  return null;
}

// --- Fetch Helpers ---

async function _fetchWithTimeout(_, request, timeoutMs) {
  timeoutMs = timeoutMs || FETCH_TIMEOUT_MS;
  swLog("_fetchWithTimeout", "ENTER timeout=" + timeoutMs, request.url, 3);
  const controller = new AbortController();
  const id = setTimeout(function() { controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(request, { signal: controller.signal });
    swLog("_fetchWithTimeout", "SUCCESS " + response.status, request.url, 3);
    return response;
  } catch (e) {
    swLog("_fetchWithTimeout", "FAILED", request.url, 3);
    throw e;
  } finally {
    clearTimeout(id);
  }
}

${
  navigationPreload
    ? `
async function fetchWithPreload(event, request, timeoutMs) {
  swLog("fetchWithPreload", "ENTER", request.url, 3);
  try {
    const preload = await Promise.race([
      event.preloadResponse,
      new Promise(function(_, reject) {
        setTimeout(function() { reject(new Error("preload timeout")); }, (timeoutMs || FETCH_TIMEOUT_MS) / 2);
      }),
    ]);
    if (preload) {
      swLog("fetchWithPreload", "HIT preload", request.url, 3);
      return preload;
    }
  } catch {}
  swLog("fetchWithPreload", "MISS preload, fallback to fetch", request.url, 3);
  return _fetchWithTimeout(_, request, timeoutMs);
}
`
    : ""
}const _fetch = ${navigationPreload ? "fetchWithPreload" : "_fetchWithTimeout"};

// --- Strategy Resolution ---

function determineCacheStrategy(request) {
  const override = request.headers.get("X-SW-Strategy");
  if (override) return { strategy: override, timeoutMs: FETCH_TIMEOUT_MS };

  const path = new URL(request.url).pathname;
  for (const [pattern, entry] of Object.entries(CUSTOM_STRATEGIES)) {
    if (matchGlob(path, pattern)) {
      const resolved = typeof entry === "string" ? { strategy: entry } : entry;
      const timeoutMs = (resolved.timeout != null ? resolved.timeout * 1000 : FETCH_TIMEOUT_MS);
      if (resolved.strategy === "reactive") {
        return {
          strategy: "reactive",
          timeoutMs: timeoutMs,
          staleTime: resolved.staleTime ?? REACTIVE_STALE_DEFAULT,
          refetchInterval: resolved.refetchInterval ?? 0,
          refetchOnFocus: resolved.refetchOnFocus ?? false,
          refetchOnReconnect: resolved.refetchOnReconnect ?? false,
        };
      }
      return { strategy: resolved.strategy, timeoutMs: timeoutMs };
    }
  }

  if (DEFAULT_STRATEGY === "reactive") {
    return {
      strategy: "reactive",
      timeoutMs: FETCH_TIMEOUT_MS,
      staleTime: REACTIVE_STALE_DEFAULT,
      refetchInterval: 0,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    };
  }
  return { strategy: DEFAULT_STRATEGY, timeoutMs: FETCH_TIMEOUT_MS };
}

// --- Reactive Entry Store ---

var REACTIVE_ENTRIES = new Map();
var REACTIVE_INTERVALS = new Map();

function registerReactiveEntry(url, config) {
  swLog("registerReactiveEntry", "ENTER", url, 4);
  if (REACTIVE_ENTRIES.has(url)) {
    swLog("registerReactiveEntry", "SKIP already registered", url, 4);
    return;
  }
  REACTIVE_ENTRIES.set(url, {
    refetchOnFocus: !!config.refetchOnFocus,
    refetchOnReconnect: !!config.refetchOnReconnect,
    refetchInterval: config.refetchInterval || 0,
    staleTime: config.staleTime || 0,
    lastRefetch: 0,
  });
  if ((config.refetchInterval || 0) > 0 && !REACTIVE_INTERVALS.has(url)) {
    var id = setInterval(function() { refetchEntry(url); }, (config.refetchInterval || 0) * 1000);
    REACTIVE_INTERVALS.set(url, id);
    swLog("registerReactiveEntry", "interval=" + config.refetchInterval + "s", url, 4);
  }
}

async function refetchEntry(url) {
  swLog("refetchEntry", "ENTER", url, 4);
  var entry = REACTIVE_ENTRIES.get(url);
  var req = new Request(url);
  if (entry) {
    var cached = await serveFromCache(req);
    if (cached && !isStale(cached, entry.staleTime)) {
      swLog("refetchEntry", "SKIP fresh in cache", url, 4);
      entry.lastRefetch = Date.now();
      return;
    }
  }
  try {
    var response = await fetchWithRetry(req, REFETCH_RETRY);
    if (response && response.ok) {
      await cacheResponse(response.clone(), req);
      if (entry) entry.lastRefetch = Date.now();
      swLog("refetchEntry", "SUCCESS", url, 4);
    }
  } catch {}
}

function handleFocusRefetch() {
  swLog("handleFocusRefetch", "ENTER entries=" + REACTIVE_ENTRIES.size, "", 0);
  REACTIVE_ENTRIES.forEach(function(config, url) {
    if (config.refetchOnFocus) refetchEntry(url);
  });
}

function handleOnlineRefetch() {
  swLog("handleOnlineRefetch", "ENTER entries=" + REACTIVE_ENTRIES.size, "", 0);
  REACTIVE_ENTRIES.forEach(function(config, url) {
    if (config.refetchOnReconnect) refetchEntry(url);
  });
}

// --- Strategies ---

/*
 * Reactive:   serve fresh from cache; if stale/miss → network → fallback
 * Network-Only: network → fallback (cache ok responses)
 * Network-First: network → cache (on fail) → fallback
 * Cache-First: cache → network (on miss) → fallback
 * Stale-While-Revalidate: stale cache immediately + bg network refresh → fallback
 * Cache-Only: cache only → 404
 */

async function reactiveStrategy(event, request, config) {
  swLog("reactiveStrategy", "ENTER", request.url, 2);
  const staleTime = config.staleTime != null ? config.staleTime : REACTIVE_STALE_DEFAULT;
  const cached = await serveFromCache(request);
  if (cached && !isStale(cached, staleTime)) return markFromCache(cached);

  try {
    const response = await _fetch(event, request, config.timeoutMs);
    if (response.ok) {
      event.waitUntil(cacheResponse(response.clone(), request));
      return response;
    }
    return fallback(request);
  } catch {
    return fallback(request);
  }
}

async function networkOnlyStrategy(event, request, config) {
  swLog("networkOnlyStrategy", "ENTER", request.url, 2);
  try {
    const response = await _fetch(event, request, config.timeoutMs);
    if (response.ok) {
      event.waitUntil(cacheResponse(response.clone(), request));
      return response;
    }
    return fallback(request);
  } catch {
    return fallback(request);
  }
}

async function networkFirstStrategy(event, request, config) {
  swLog("networkFirstStrategy", "ENTER", request.url, 2);
  try {
    const response = await _fetch(event, request, config.timeoutMs);
    if (response.ok) {
      event.waitUntil(cacheResponse(response.clone(), request));
      return response;
    }
    const cached = await serveFromCache(request);
    if (cached) return markFromCache(cached);
    return fallback(request);
  } catch {
    const cached = await serveFromCache(request);
    if (cached) return markFromCache(cached);
    return fallback(request);
  }
}

async function cacheFirstStrategy(event, request, config) {
  swLog("cacheFirstStrategy", "ENTER", request.url, 2);
  const cached = await serveFromCache(request);
  if (cached) return markFromCache(cached);

  try {
    const response = await _fetch(event, request, config.timeoutMs);
    if (response.ok) {
      event.waitUntil(cacheResponse(response.clone(), request));
      return response;
    }
    return fallback(request);
  } catch {
    return fallback(request);
  }
}

async function staleWhileRevalidateStrategy(event, request, config) {
  swLog("staleWhileRevalidateStrategy", "ENTER", request.url, 2);
  const cached = await serveFromCache(request);

  event.waitUntil(
    (async function() {
      try {
        var response = await fetchWithRetry(request, REFETCH_RETRY);
        if (response && response.ok) await cacheResponse(response.clone(), request);
      } catch {}
    })(),
  );

  if (cached) return markFromCache(cached);
  try {
    return await _fetch(event, request, config.timeoutMs);
  } catch {
    return fallback(request);
  }
}

async function cacheOnlyStrategy(event, request, _config) {
  swLog("cacheOnlyStrategy", "ENTER", request.url, 2);
  const cached = await serveFromCache(request);
  if (cached) return markFromCache(cached);
  swLog("cacheOnlyStrategy", "MISS 404", request.url, 2);
  return new Response("Not in cache", { status: 404 });
}

const STRATEGY_HANDLERS = {
  "reactive": reactiveStrategy,
  "network-only": networkOnlyStrategy,
  "network-first": networkFirstStrategy,
  "cache-first": cacheFirstStrategy,
  "stale-while-revalidate": staleWhileRevalidateStrategy,
  "cache-only": cacheOnlyStrategy,
};

async function _executeStrategy(event, request, config) {
  swLog("_executeStrategy", "ENTER strategy=" + config.strategy, request.url, 1);
  const handler = STRATEGY_HANDLERS[config.strategy] || cacheFirstStrategy;
  try {
    return await handler(event, request, config);
  } catch {
    return fallback(request);
  }
}

function applyStrategy(event, request, config) {
  event.respondWith(_executeStrategy(event, request, config));
}

${
  mutationQueueEnabled
    ? `// --- Mutation Queue IDB Helpers ---

const MUTATION_DB_NAME = "swoff-queue";
const MUTATION_STORE_NAME = "mutations";
const MUTATION_DB_VERSION = 1;

async function storeMutationInSW(request) {
  swLog("storeMutationInSW", "ENTER", request.url, 4);
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

  const db = await openDB(MUTATION_DB_NAME, MUTATION_DB_VERSION, function(db) {
    if (!db.objectStoreNames.contains(MUTATION_STORE_NAME)) {
      const store = db.createObjectStore(MUTATION_STORE_NAME, { keyPath: "id" });
      store.createIndex("by-timestamp", "timestamp");
    }
  });
  const tx = db.transaction(MUTATION_STORE_NAME, "readwrite");
  const store = tx.objectStore(MUTATION_STORE_NAME);${
    maxCacheAge && maxCacheAge > 0
      ? `
  // Prune entries past max age
  const cutoff = Date.now() - MAX_RUNTIME_CACHE_AGE * 1000;
  const allEntries = await new Promise(function(resolve, reject) {
    var req = store.getAll();
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
  for (const item of allEntries) {
    if (item.timestamp && item.timestamp < cutoff) {
      store.delete(item.id);
    }
  }`
      : ""
  }
  store.add({
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
  swLog("storeMutationInSW", "STORED", request.url, 4);
}

async function _fetchMutation(request) {
  swLog("_fetchMutation", "ENTER", request.url, 4);
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(request, { signal: controller.signal });
    swLog("_fetchMutation", "SUCCESS " + response.status, request.url, 4);
    return response;
  } catch (e) {
    swLog("_fetchMutation", "FAILED", request.url, 4);
    throw e;
  } finally {
    clearTimeout(id);
  }
}

async function handleMutation(event) {
  swLog("handleMutation", "ENTER", event.request.url, 3);
  const request = event.request;
  if (request.headers.get("X-SW-No-Queue") === "true") {
    swLog("handleMutation", "no-queue mode", request.url, 3);
    try {
      return await _fetchMutation(request.clone());
    } catch {
      throw new Error("Mutation failed (no-queue mode)");
    }
  }
  try {
    return await _fetchMutation(request.clone());
  } catch {
    swLog("handleMutation", "queuing mutation", request.url, 3);
    await storeMutationInSW(request);
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
  swLog("fetch", "INCOMING", request.url, 0);${
    mutationQueueEnabled
      ? `
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (request.headers.get("X-SW-Cache-Strategy") === "mutation") {
      event.respondWith(handleMutation(event));
      return;
    }
    if (!request.headers.get("X-SW-Cache-Key")) { return; }
  }`
      : `
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (!request.headers.get("X-SW-Cache-Key")) { return; }
  }`
  }
  const cfg = determineCacheStrategy(request);
  swLog("fetch", "strategy=" + cfg.strategy, request.url, 0);
  if (cfg.strategy === "reactive") {
    registerReactiveEntry(cacheKey(request), cfg);
  }
  applyStrategy(event, request, cfg);
});`;
}
