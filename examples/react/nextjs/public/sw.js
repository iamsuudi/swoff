let CACHE_NAME = "";
let ASSETS_TO_CACHE = [];

CACHE_NAME = 'sw-cache-mq9pgfvf'
ASSETS_TO_CACHE = [
  {
    "url": "/offline.html",
    "options": {}
  },
  {
    "url": "/manifest.json",
    "options": {}
  },
  {
    "url": "/file.svg",
    "options": {}
  },
  {
    "url": "/globe.svg",
    "options": {}
  },
  {
    "url": "/maskable-icon-512x512.png",
    "options": {}
  },
  {
    "url": "/next.svg",
    "options": {}
  },
  {
    "url": "/pwa-192x192.png",
    "options": {}
  },
  {
    "url": "/pwa-512x512.png",
    "options": {}
  },
  {
    "url": "/pwa-64x64.png",
    "options": {}
  },
  {
    "url": "/vercel.svg",
    "options": {}
  },
  {
    "url": "/window.svg",
    "options": {}
  },
  {
    "url": "/_next/static/2W2yOnLN1_ETjRpiL_Wo1/_buildManifest.js",
    "options": {}
  },
  {
    "url": "/_next/static/2W2yOnLN1_ETjRpiL_Wo1/_clientMiddlewareManifest.js",
    "options": {}
  },
  {
    "url": "/_next/static/2W2yOnLN1_ETjRpiL_Wo1/_ssgManifest.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/0.550id55~-3h.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/00dnf_pj.q2on.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/01xlw8hd842-c.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/02g3221oh~3le.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/03~yq9q893hmn.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/05.-slimshgcr.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/07lhk_q6pmm3r.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/0bzupvr5gt3k9.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/0cifb5l_xewo7.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/0d3shmwh5_nmn.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/0pj4g.~bmgyjm.css",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/0pqt~8bl3ukh4.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/0tkil9v1nrq5o.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/0wwjasw.d5.0u.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/0zpusoduyxb-z.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/1073eqml-_spa.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/130pav8h1a7~4.js",
    "options": {}
  },
  {
    "url": "/_next/static/chunks/turbopack-0l.eg18p.4nbp.js",
    "options": {}
  },
  {
    "url": "/_next/static/media/favicon.0x3dzn~oxb6tn.ico",
    "options": {}
  }
]
const AUTO_SKIP_WAITING = false;

const CACHE_NAME_RUNTIME = "swoff-runtime";
const CACHE_NAME_RUNTIME_HTML = "swoff-runtime-html";

// --- Shared IndexedDB Utility ---

function openDB(dbName, version, onUpgrade) {
  return new Promise(function(resolve, reject) {
    var request = indexedDB.open(dbName, version);
    request.onupgradeneeded = function(e) {
      if (onUpgrade) onUpgrade(e.target.result);
    };
    request.onsuccess = function(e) { resolve(e.target.result); };
    request.onerror = function(e) { reject(e.target.error); };
  });
}


async function precacheAssets() {
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
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach((client) => {
        client.postMessage({
          type: "SW_NOTIFICATION",
          level: "warn",
          code: "PRECACHE_FAILED",
          message: `Failed to precache ${asset.url}`,
        });
      });
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
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await precacheAssets();
      if (AUTO_SKIP_WAITING) self.skipWaiting();
    })(),
  );
});

const MAX_RUNTIME_CACHE_AGE = 2592000;

async function evictStaleRuntimeCache() {
  for (const name of [CACHE_NAME_RUNTIME, CACHE_NAME_RUNTIME_HTML]) {
    const cache = await caches.open(name);
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
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await evictStaleRuntimeCache();
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== CACHE_NAME_RUNTIME && key !== CACHE_NAME_RUNTIME_HTML).map((key) => caches.delete(key))
      );
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data.type === "FOCUS") {
    if (typeof handleFocusRefetch === "function") handleFocusRefetch();
  }
  if (event.data.type === "ONLINE") {
    if (typeof handleOnlineRefetch === "function") handleOnlineRefetch();
  }
  if (event.data.type === "RESET_CACHE") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await precacheAssets();
        const port = event.ports?.[0];
        port?.postMessage({ type: "RESET_CACHE_COMPLETE" });
      })(),
    );
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
});
// --- Mode & Strategy Configuration ---

const NAV_MODE = "ssr";
const FALLBACK_PATH = "/offline.html";
const DEFAULT_STRATEGY = "network-first";
const CUSTOM_STRATEGIES = {"/_next/static*":"cache-first"};
const REACTIVE_STALE_DEFAULT = 0;
const FETCH_TIMEOUT_MS = 10000;
const REFETCH_RETRY = {"maxRetries":3,"backoffMs":1000,"maxBackoffMs":10000,"jitterMs":100};
const SW_DEBUG = true;

// --- Debug Logging ---

function swLog(fn, msg, url, indent) {
  if (!SW_DEBUG) return;
  var prefix = "";
  for (var i = 0; i < (indent || 0); i++) prefix += "  ";
  console.log("[SW]" + prefix, fn + ":", msg, url || "", Date.now());
}


// --- Glob Pattern Matching ---

function escapeGlobMeta(s) {
  return s.replace(/[.+^${}()|[\]\\]/g, "\\// [[FETCH_HANDLER]]");
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

// --- Navigation Detection ---

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
  const url = new URL(request.url);
  if (url.search) {
    const params = new URLSearchParams(url.search);
    const ignore = ["rsc"];
    for (const key of ignore) params.delete(key);
    url.search = params.toString();
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
  }
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
  }
}

// --- Fallback ---

/*
 * Fallback hierarchy for when a strategy cannot serve a response:
 *   SSR / Default:  per-route → global fallback → inline 503
 *   SPA:            per-route → inline 503
 */
async function fallback(request) {
  swLog("fallback", "ENTER", request.url, 3);
  if (NAV_MODE !== "spa") {
    const htmlCache = await caches.open(CACHE_NAME_RUNTIME_HTML);
    const htmlMatch = await htmlCache.match(cacheKey(request));
    if (htmlMatch) {
      swLog("fallback", "HIT runtime-html", request.url, 3);
      return htmlMatch;
    }
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

function inline503Response() {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Offline</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}div{text-align:center}h1{font-size:2rem;color:#333}p{color:#666}</style></head><body><div><h1>You\'re offline</h1><p>Please check your connection and try again.</p></div></body></html>`,
    { status: 503, headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } }
  );
}
// --- Response Helpers ---

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

const _fetch = _fetchWithTimeout;

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

// --- Mutation Queue IDB Helpers ---

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
  const store = tx.objectStore(MUTATION_STORE_NAME);
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

self.addEventListener("fetch", (event) => {
  const { request } = event;
  swLog("fetch", "INCOMING", request.url, 0);
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (request.headers.get("X-SW-Cache-Strategy") === "mutation") {
      event.respondWith(handleMutation(event));
      return;
    }
    if (!request.headers.get("X-SW-Cache-Key")) { return; }
  }
  const cfg = determineCacheStrategy(request);
  swLog("fetch", "strategy=" + cfg.strategy, request.url, 0);
  if (cfg.strategy === "reactive") {
    registerReactiveEntry(cacheKey(request), cfg);
  }
  applyStrategy(event, request, cfg);
});

const TAG_DB_NAME = "swoff-cache-tags";
const TAG_STORE_NAME = "tags";
// Bump this when adding new indexes/stores for schema migration
const TAG_DB_VERSION = 1;

async function cacheTagUrl(url, actualUrl, tags, method, body, contentType) {
  const db = await openDB(TAG_DB_NAME, TAG_DB_VERSION, function(db) {
    if (!db.objectStoreNames.contains(TAG_STORE_NAME)) {
      const store = db.createObjectStore(TAG_STORE_NAME, { keyPath: "url" });
      store.createIndex("by-tag", "tags", { multiEntry: true });
    }
  });
  const tx = db.transaction(TAG_STORE_NAME, "readwrite");
  const store = tx.objectStore(TAG_STORE_NAME);
  // Prune entries older than MAX_RUNTIME_CACHE_AGE
  const cutoff = Date.now() - MAX_RUNTIME_CACHE_AGE * 1000;
  const index = store.index("by-tag");
  const allEntries = await new Promise(function(resolve, reject) {
    var req = index.getAll();
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
  for (const entry of allEntries) {
    if (entry.timestamp && entry.timestamp < cutoff) {
      store.delete(entry.url);
    }
  }
  store.put({ url, actualUrl, tags, method: method || "GET", body: body || null, contentType: contentType || null, timestamp: Date.now() });
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getUrlsForTag(tag) {
  const db = await openDB(TAG_DB_NAME, TAG_DB_VERSION);
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
  const db = await openDB(TAG_DB_NAME, TAG_DB_VERSION);
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

async function invalidateByTag(tag) {
  const db = await openDB(TAG_DB_NAME, TAG_DB_VERSION);
  const tx = db.transaction(TAG_STORE_NAME, "readwrite");
  const store = tx.objectStore(TAG_STORE_NAME);
  const index = store.index("by-tag");
  const entries = await new Promise((resolve, reject) => {
    const request = index.getAll(tag);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (!entries || entries.length === 0) {
    tx.oncomplete = () => db.close();
    return;
  }

  for (const entry of entries) {
    store.delete(entry.url);
  }
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
  const rscCache = await caches.open(CACHE_NAME_RUNTIME_HTML);
  for (const entry of entries) {
    await runtimeCache.delete(entry.url);
    await rscCache.delete(entry.url);
    refetchEntry(entry.url);
  }

  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "TAG_INVALIDATED", tag });
  });
}

async function invalidateMatching(globPattern) {
  const db = await openDB(TAG_DB_NAME, TAG_DB_VERSION);
  const tx = db.transaction(TAG_STORE_NAME, "readonly");
  const store = tx.objectStore(TAG_STORE_NAME);
  const allEntries = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await db.close();

  const matching = allEntries.filter((entry) => matchGlob(entry.actualUrl, globPattern));
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
const SW_MAX_BACKOFF_MS = 30000;
const SW_JITTER_MS = 250;
// Bump this when adding new indexes/stores for schema migration
const SW_DB_VERSION = 1;

function swSleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffDelay(attempt) {
  const delay = Math.min(SW_RETRY_BACKOFF_MS * Math.pow(2, attempt), SW_MAX_BACKOFF_MS);
  return delay + (SW_JITTER_MS > 0 ? Math.random() * SW_JITTER_MS : 0);
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
    db = await openDB("swoff-queue", SW_DB_VERSION, function(db) {
      if (!db.objectStoreNames.contains("mutations")) {
        const store = db.createObjectStore("mutations", { keyPath: "id" });
        store.createIndex("by-timestamp", "timestamp");
      }
    });

    const tx = db.transaction("mutations", "readwrite");
    const store = tx.objectStore("mutations");
    const index = store.index("by-timestamp");
    // Prune entries past max age
    const cutoff = Date.now() - MAX_RUNTIME_CACHE_AGE * 1000;
    const allEntries = await new Promise(function(resolve, reject) {
      var req = index.getAll();
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
    for (const item of allEntries) {
      if (item.retryCount >= SW_MAX_RETRIES || (item.timestamp && item.timestamp < cutoff)) {
        store.delete(item.id);
      }
    }
    const queue = await new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Pre-filter: remove permanently failed items first, then filter for processable ones
    const now = Date.now();
    for (const item of queue) {
      if (item.retryCount >= SW_MAX_RETRIES) {
        store.delete(item.id);
        failed++;
      }
    }
    const processable = queue.filter(item => {
      if (item.retryCount >= SW_MAX_RETRIES) return false;
      return !item.nextRetryAt || now >= item.nextRetryAt;
    });
    const total = processable.length;

    // Collect all mutations to update/remove in a single batch at the end
    const toRemove = [];
    const toUpdate = [];

    for (const item of processable) {
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

        toRemove.push(item.id);
        succeeded++;
      } catch {
        item.retryCount++;
        if (item.retryCount >= SW_MAX_RETRIES) {
          toRemove.push(item.id);
        } else {
          item.nextRetryAt = Date.now() + backoffDelay(item.retryCount - 1);
          toUpdate.push(item);
        }
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

    // Batch all writes in a single transaction
    const writeTx = db.transaction("mutations", "readwrite");
    const writeStore = writeTx.objectStore("mutations");
    for (const id of toRemove) {
      writeStore.delete(id);
    }
    for (const item of toUpdate) {
      writeStore.put(item);
    }
    await new Promise(function(resolve, reject) {
      writeTx.oncomplete = function() { resolve(); };
      writeTx.onerror = function() { reject(writeTx.error); };
    });
  } catch (err) {
    console.error("Background sync failed:", err);
    const syncClients = await self.clients.matchAll();
    for (const c of syncClients) {
      c.postMessage({
        type: "SW_NOTIFICATION",
        level: "error",
        code: "BACKGROUND_SYNC_FAILED",
        message: "Background sync processing failed",
      });
    }
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

// Dev mode fallback
if (!CACHE_NAME) CACHE_NAME = "sw-dev-cache";
