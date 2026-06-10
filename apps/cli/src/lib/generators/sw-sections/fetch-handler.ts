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
    },
  } = swConfig;

  const debugMode = debug === true;
  const globalStaleTime = swConfig.strategy.reactive?.defaults?.staleTime;

  const hasRules = navRules.length > 0;
  const navModeCode = navMode === "ssr" ? '"ssr"' : navMode === "spa" ? '"spa"' : '"default"';
  const fallbackCode = globalFallback ? `"${globalFallback}"` : '""';

  const navRulesCode = hasRules
    ? `const NAV_RULES = ${JSON.stringify(navRules.map((r) => ({
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

  return `// --- Mode & Strategy Configuration ---

const NAV_MODE = ${navModeCode};
const FALLBACK_PATH = ${fallbackCode};
const DEFAULT_STRATEGY = "${defaultStrategy}";
const CUSTOM_STRATEGIES = ${JSON.stringify(strategies)};
const REACTIVE_STALE_DEFAULT = ${globalStaleTime != null ? globalStaleTime : 0};
const FETCH_TIMEOUT_MS = ${fetchTimeout * 1000};
const SW_DEBUG = ${debugMode};

${navRulesCode}// --- Debug Logging ---

function swLog(fn, msg, url) {
  if (!SW_DEBUG) return;
  console.log("[SW][" + fn + "]", msg, url || "", Date.now());
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
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  url.search = "";
  return cache.match(url.href);
}

async function fromRuntime(request) {
  const cache = await caches.open(CACHE_NAME_RUNTIME);
  return cache.match(cacheKey(request));
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
  if (isNavRequest(request)) {
    if (NAV_MODE === "spa") return null;
    const pc = await fromPrecache(request);
    if (pc) return pc;
    const htmlCache = await caches.open(CACHE_NAME_RUNTIME_HTML);
    return htmlCache.match(cacheKey(request));
  }
  const cached = await fromRuntime(request);
  if (cached) return cached;
  return fromPrecache(request);
}

// --- Cache Store ---

async function storeRuntime(key, response) {
  const ct = response.headers.get("Content-Type") || "";
  const cacheName = ct.startsWith("text/html") ? CACHE_NAME_RUNTIME_HTML : CACHE_NAME_RUNTIME;
  const cache = await caches.open(cacheName);
  const headers = new Headers(response.headers);
  headers.set("X-SW-Cached-At", String(Date.now()));
  await cache.put(key, new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  }));
}

/*
 * cacheResponse stores a network response in the appropriate cache.
 *
 * Content-type rules:
 *   text/html         → runtime-html cache
 *   js / css / images → runtime cache (or precache if same content-type)
 *   SPA navigations   → never cached
 *
 * If the response already exists in precache and the content-type matches,
 * the precache entry is updated instead of creating a runtime duplicate.
 */
async function cacheResponse(response, request) {
  if (isNavRequest(request) && NAV_MODE === "spa") return;
  const key = cacheKey(request);
  const ct = response.headers.get("Content-Type") || "";

  if (!ct.startsWith("text/html")) {
    const precache = await caches.open(CACHE_NAME);
    const url = new URL(key);
    url.search = "";
    const precached = await precache.match(url.href);
    if (precached) {
      const pct = precached.headers.get("Content-Type") || "";
      if (pct.split(";")[0] === ct.split(";")[0]) {
        await precache.put(url.href, response.clone());
        return;
      }
      return;
    }
  }

  await storeRuntime(key, response);${tagCode}
}

// --- Fallback ---

/*
 * Fallback hierarchy for when a strategy cannot serve a response:
 *   SSR / Default:  per-route → global fallback → inline 503
 *   SPA:            per-route → inline 503
 */
async function fallback(request) {
  const isNav = isNavRequest(request);${
    hasRules
      ? `
  if (isNav) {
    const routeFallbackPath = matchRouteFallback(request.url);
    if (routeFallbackPath) {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(routeFallbackPath);
      if (match) {
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({
            type: "OFFLINE_FALLBACK_ACTIVATED",
            detail: { route: new URL(request.url).pathname, fallbackLevel: "route-fallback", timestamp: Date.now() },
          });
        }
        return match;
      }
    }
  }`
      : ""
  }
  if (!isNav || NAV_MODE !== "spa") {
    if (FALLBACK_PATH) {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(FALLBACK_PATH);
      if (match) {
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

// --- Fetch Helpers ---

async function _fetchWithConditional(request) {
  swLog("_fetchWithConditional", "ENTER timeout=" + FETCH_TIMEOUT_MS, request.url);
  let cached;
  if (!(isNavRequest(request) && NAV_MODE === "spa")) {
    const cache = await caches.open(CACHE_NAME_RUNTIME);
    cached = await cache.match(cacheKey(request));
    if (!cached && isNavRequest(request)) {
      const htmlCache = await caches.open(CACHE_NAME_RUNTIME_HTML);
      cached = await htmlCache.match(cacheKey(request));
    }
  }
  const etag = cached?.headers.get("ETag");
  if (etag) {
    request = new Request(request, {
      headers: Object.assign(Object.fromEntries(request.headers.entries()), { "If-None-Match": etag }),
    });
  }
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(id);
    if (response.status === 304 && cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-SW-Cached-At", String(Date.now()));
      return new Response(cached.body, {
        status: 200,
        statusText: cached.statusText,
        headers,
      });
    }
    return response;
  } catch {
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        type: "SW_NOTIFICATION", level: "error", code: "FETCH_FAILED",
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
  try {
    const preload = await event.preloadResponse;
    if (preload) return preload;
  } catch {}
  return _fetchWithConditional(request);
}
`
    : ""
}const _fetch = ${navigationPreload ? "fetchWithPreload" : "_fetchWithConditional"};

// --- Strategy Resolution ---

function determineCacheStrategy(request) {
  const override = request.headers.get("X-SW-Strategy");
  if (override) return { strategy: override };

  const path = new URL(request.url).pathname;
  for (const [pattern, entry] of Object.entries(CUSTOM_STRATEGIES)) {
    if (matchGlob(path, pattern)) {
      const resolved = typeof entry === "string" ? { strategy: entry } : entry;
      if (resolved.strategy === "reactive") {
        return { strategy: "reactive", staleTime: resolved.staleTime ?? REACTIVE_STALE_DEFAULT };
      }
      return { strategy: resolved.strategy };
    }
  }

  if (DEFAULT_STRATEGY === "reactive") {
    return { strategy: "reactive", staleTime: REACTIVE_STALE_DEFAULT };
  }
  return { strategy: DEFAULT_STRATEGY };
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

async function reactiveStrategy(event, request, staleTime) {
  const cached = await serveFromCache(request);
  if (cached && !isStale(cached, staleTime)) return markFromCache(cached);

  try {
    const response = await _fetch(event, request);
    if (response.ok) {
      event.waitUntil(cacheResponse(response.clone(), request));
      return response;
    }
    return fallback(request);
  } catch {
    return fallback(request);
  }
}

async function networkOnlyStrategy(event, request) {
  try {
    const response = await _fetch(event, request);
    if (response.ok) {
      event.waitUntil(cacheResponse(response.clone(), request));
      return response;
    }
    return fallback(request);
  } catch {
    return fallback(request);
  }
}

async function networkFirstStrategy(event, request) {
  try {
    const response = await _fetch(event, request);
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

async function cacheFirstStrategy(event, request) {
  const cached = await serveFromCache(request);
  if (cached) return markFromCache(cached);

  try {
    const response = await _fetch(event, request);
    if (response.ok) {
      event.waitUntil(cacheResponse(response.clone(), request));
      return response;
    }
    return fallback(request);
  } catch {
    return fallback(request);
  }
}

async function staleWhileRevalidateStrategy(event, request) {
  const cached = await serveFromCache(request);

  event.waitUntil(
    (async () => {
      try {
        const response = await _fetch(event, request);
        if (response.ok) await cacheResponse(response.clone(), request);
      } catch {}
    })(),
  );

  if (cached) return markFromCache(cached);
  try {
    return await _fetch(event, request);
  } catch {
    return fallback(request);
  }
}

async function cacheOnlyStrategy(event, request) {
  const cached = await serveFromCache(request);
  if (cached) return markFromCache(cached);
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
  swLog("fetch", "INCOMING", request.url);${
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
  swLog("fetch", "strategy=" + cfg.strategy, request.url);
  applyStrategy(event, request, cfg);
});`;
}
