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
  authRoutePaths: string[],
  serverPushEndpoint?: string,
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
    if (method !== "GET") {
      contentType = request.headers.get("Content-Type");
      try { body = await request.clone().text(); } catch {}
    }
    await cacheTagUrl(cacheKeyUrl, actualUrl, tags, method, body, contentType);
  }`
    : "";

  return `// --- Mode & Strategy Configuration ---

const NAV_MODE = ${navModeCode};
const FALLBACK_PATH = ${fallbackCode};
const DEFAULT_STRATEGY = "${defaultStrategy}";
const CUSTOM_STRATEGIES = ${JSON.stringify(strategies)};
const REACTIVE_STALE_DEFAULT = ${globalStaleTime != null ? globalStaleTime : 0};
const FETCH_TIMEOUT_MS = ${fetchTimeout * 1000};
const SW_DEBUG = ${debugMode};
${authRoutePaths.length > 0 ? `const AUTH_ROUTES = ${JSON.stringify(authRoutePaths)};` : ""}
${serverPushEndpoint ? `const SERVER_PUSH_ENDPOINT = "${serverPushEndpoint}";` : ""}

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
 *   runtime → precache (content-type match only) → null
 *
 * Precache is content-type-gated for non-navigation requests to avoid
 * serving HTML pages (stored with stripped extensions) for requests that
 * expect a different content type (e.g. RSC payloads, JSON fetches).
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
    const accept = request.headers.get("Accept") || "*/*";
    const pcType = (pc.headers.get("Content-Type") || "").split(";")[0].trim();
    if (accept.includes(pcType) || accept.includes("*/*") || !pcType) {
      swLog("serveFromCache", "HIT precache (sub)", request.url, 3);
      return pc;
    }
    swLog("serveFromCache", "SKIP precache (type mismatch)", request.url, 3);
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
        try {
          await precache.put(url.href, response.clone());
          swLog("cacheResponse", "updated precache", request.url, 3);
        } catch (e) {
          swLog("cacheResponse", "precache update failed", request.url, 3);
        }
      }
    }
    skipRuntime = true;
  }

  if (!skipRuntime) {
    const cacheName = ct.startsWith("text/html") ? CACHE_NAME_RUNTIME_HTML : CACHE_NAME_RUNTIME;
    const cache = await caches.open(cacheName);
    const headers = new Headers(response.headers);
    headers.set("X-SW-Cached-At", String(Date.now()));
    const putResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    try {
      await cache.put(key, putResponse);
      swLog("cacheResponse", "stored in " + cacheName, request.url, 3);
    } catch (e) {
      swLog("cacheResponse", "quota error, evicting stale entries", request.url, 3);
      try {
        // Evict stale runtime entries and retry once
        for (const name of [CACHE_NAME_RUNTIME, CACHE_NAME_RUNTIME_HTML]) {
          const c = await caches.open(name);
          const keys = await c.keys();
          const now = Date.now();
          for (const req of keys) {
            const res = await c.match(req);
            const cachedAt = res ? Number(res.headers.get("X-SW-Cached-At") || 0) : 0;
            if (!cachedAt || now - cachedAt > 3600000) await c.delete(req);
          }
        }
        await cache.put(key, putResponse.clone());
        swLog("cacheResponse", "stored after eviction", request.url, 3);
      } catch {}
    }
  }${tagCode}
}

// --- Fallback ---

/*
 * Fallback hierarchy for when a strategy cannot serve a response:
 *   SSR / Default:  precache → runtime-html → per-route → global → inline 503
 *   SPA:            per-route → inline 503
 */
async function fallback(request) {
  swLog("fallback", "ENTER", request.url, 3);
  const pc = await fromPrecache(request);
  if (pc) {
    swLog("fallback", "HIT precache", request.url, 3);
    return pc;
  }
  if (NAV_MODE !== "spa") {
    const htmlCache = await caches.open(CACHE_NAME_RUNTIME_HTML);
    const htmlMatch = await htmlCache.match(cacheKey(request));
    if (htmlMatch) {
      swLog("fallback", "HIT runtime-html", request.url, 3);
      return htmlMatch;
    }
  }${
    hasRules
      ? `
    const routeFallbackPath = matchRouteFallback(request.url);
    if (routeFallbackPath) {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(routeFallbackPath);
      if (match) {
        swLog("fallback", "HIT per-route fallback", request.url, 3);
        broadcastToClients("OFFLINE_FALLBACK_ACTIVATED", { detail: { route: new URL(request.url).pathname, fallbackLevel: "route-fallback", timestamp: Date.now() } });
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
        broadcastToClients("OFFLINE_FALLBACK_ACTIVATED", { detail: { route: new URL(request.url).pathname, fallbackLevel: "offline-page", timestamp: Date.now() } });
        return match;
      }
    }
  }
  swLog("fallback", "HIT inline 503", request.url, 3);
  broadcastToClients("OFFLINE_FALLBACK_ACTIVATED", { detail: { route: new URL(request.url).pathname, fallbackLevel: "inline-503", timestamp: Date.now() } });
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
  if (staleTimeSeconds == null) return false;
  if (staleTimeSeconds === 0) return true;
  if (staleTimeSeconds < 0) return false;
  const cachedAt = response.headers.get("X-SW-Cached-At");
  if (!cachedAt) return false;
  return Date.now() - Number(cachedAt) > staleTimeSeconds * 1000;
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
  if (override) {
    if (override === "reactive") {
      const staleTimeHeader = request.headers.get("X-SW-Stale-Time");
      return {
        strategy: "reactive",
        timeoutMs: FETCH_TIMEOUT_MS,
        staleTime: staleTimeHeader != null ? Number(staleTimeHeader) : REACTIVE_STALE_DEFAULT,
        refetchInterval: Number(request.headers.get("X-SW-Refetch-Interval") || 0),
        refetchOnFocus: request.headers.get("X-SW-Refetch-On-Focus") === "true",
        refetchOnReconnect: request.headers.get("X-SW-Refetch-On-Reconnect") === "true",
      };
    }
    return { strategy: override, timeoutMs: FETCH_TIMEOUT_MS };
  }

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

REACTIVE_ENTRIES = new Map();
REACTIVE_INTERVALS = new Map();
clearAllReactive = function() {
  REACTIVE_INTERVALS.forEach(function(id) { clearInterval(id); });
  REACTIVE_INTERVALS.clear();
  REACTIVE_ENTRIES.clear();
  swLog("clearAllReactive", "done", "", 0);
};

function registerReactiveEntry(url, actualUrl, config) {
  swLog("registerReactiveEntry", "ENTER", url, 4);
  if (REACTIVE_ENTRIES.has(url)) {
    swLog("registerReactiveEntry", "SKIP already registered", url, 4);
    return;
  }
  REACTIVE_ENTRIES.set(url, {
    actualUrl: actualUrl,
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
  var fetchUrl = entry ? entry.actualUrl || url : url;
  var req = new Request(fetchUrl);
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
      broadcastToClients("CACHE_UPDATED", { url: fetchUrl });
    }
    checkAuthFailure(response);
  } catch {}
}

function handleRefetch(prop) {
  swLog("handleRefetch", "ENTER prop=" + prop + " entries=" + REACTIVE_ENTRIES.size, "", 0);
  REACTIVE_ENTRIES.forEach(function(config, url) {
    if (config[prop]) queueRefresh(url);
  });
}

async function isAuthFailureResponse(response) {
  return response.status === 401;
}

async function checkAuthFailure(response) {
  if (response && await isAuthFailureResponse(response)) {
    swLog("checkAuthFailure", "AUTH_FAILURE", response.url || "", 1);
    broadcastToClients("AUTH_FAILURE");
  }
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

  if (cached && isStale(cached, staleTime)) {
    event.waitUntil(queueRefresh(cacheKey(request)));
    return markFromCache(cached);
  }

  try {
    const response = await _fetch(event, request, config.timeoutMs);
    checkAuthFailure(response);
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
    checkAuthFailure(response);
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
    checkAuthFailure(response);
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

  event.waitUntil(queueRefresh(request.url));

  if (cached) return markFromCache(cached);
  try {
    const response = await _fetch(event, request, config.timeoutMs);
    checkAuthFailure(response);
    if (response.ok) {
      event.waitUntil(cacheResponse(response.clone(), request));
      return response;
    }
    return fallback(request);
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
  });${
    maxCacheAge && maxCacheAge > 0
      ? `
  // Prune expired entries in a separate transaction
  await pruneStaleStore(db, MUTATION_STORE_NAME, Date.now() - MAX_RUNTIME_CACHE_AGE * 1000, "id");`
      : ""
  }
  const tx = db.transaction(MUTATION_STORE_NAME, "readwrite");
  const store = tx.objectStore(MUTATION_STORE_NAME);
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
  try {
    await new Promise(function(resolve, reject) {
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function() { reject(tx.error); };
    });
    swLog("storeMutationInSW", "STORED", request.url, 4);
  } finally {
    db.close();
  }
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
      const response = await _fetchMutation(request.clone());
      checkAuthFailure(response);
      return response;
    } catch {
      throw new Error("Mutation failed (no-queue mode)");
    }
  }
  try {
    const response = await _fetchMutation(request.clone());
    checkAuthFailure(response);
    return response;
  } catch {
    swLog("handleMutation", "queuing mutation", request.url, 3);
    await storeMutationInSW(request);
    broadcastToClients("MUTATION_STORED");
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
    serverPushEndpoint
      ? `
  if (SERVER_PUSH_ENDPOINT && request.url.includes(SERVER_PUSH_ENDPOINT)) {
    swLog("fetch", "server-push-bypass", request.url, 0);
    return;
  }`
      : ""
  }${
    authRoutePaths.length > 0
      ? `
  if (AUTH_ROUTES.some(function(route) { return request.url.includes(route); })) {
    swLog("fetch", "auth-route-bypass", request.url, 0);
    return;
  }`
      : ""
  }
  if (request.headers.get("X-SW-Strategy") === "network-only") {
    swLog("fetch", "strategy=network-only", request.url, 0);
    return;
  }${
    mutationQueueEnabled
      ? `
  if (request.method !== "GET") {
    if (request.headers.get("X-SW-Cache-Strategy") === "mutation") {
      event.respondWith(handleMutation(event));
      return;
    }
    if (!request.headers.get("X-SW-Cache-Key")) { return; }
  }`
      : `
  if (request.method !== "GET") {
    if (!request.headers.get("X-SW-Cache-Key")) { return; }
  }`
  }
  const cfg = determineCacheStrategy(request);
  swLog("fetch", "strategy=" + cfg.strategy, request.url, 0);
  if (cfg.strategy === "reactive") {
    registerReactiveEntry(cacheKey(request), request.url, cfg);
  } else if (cfg.strategy === "network-only") {
    return;
  }
  applyStrategy(event, request, cfg);
});`;
}
