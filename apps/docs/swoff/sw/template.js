let PRECACHE_CONCURRENCY = 1;
let PRECACHE_DELAY_MS = 0;
let AUTO_SKIP_WAITING = false;

// --- Shared IndexedDB Utility ---

function openDB(dbName, version, onUpgrade) {
  return new Promise(function(resolve, reject) {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available (private browsing mode?)"));
      return;
    }
    try {
      var request = indexedDB.open(dbName, version);
      request.onupgradeneeded = function(e) {
        if (onUpgrade) onUpgrade(e.target.result);
      };
      request.onsuccess = function(e) { resolve(e.target.result); };
      request.onerror = function(e) { reject(e.target.error); };
    } catch (e) {
      reject(e);
    }
  });
}

// --- Shared Reactive Intervals ---

var REACTIVE_ENTRIES = null;
var REACTIVE_INTERVALS = null;
var clearAllReactive = null;

// --- IDB Pruning Helper ---

function pruneStaleStore(db, storeName, cutoff, keyField) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(storeName, "readwrite");
    var store = tx.objectStore(storeName);
    var req = store.getAll();
    req.onsuccess = function() {
      var entries = req.result;
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].timestamp && entries[i].timestamp < cutoff) {
          store.delete(entries[i][keyField || "url"]);
        }
      }
    };
    req.onerror = function() { reject(req.error); };
    tx.oncomplete = function() { resolve(); };
    tx.onerror = function() { reject(tx.error); };
  });
}

// --- Broadcast Helper ---

function broadcastToClients(type, payload) {
  return self.clients.matchAll().then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage(Object.assign({ type: type }, payload || {}));
    });
  });
}


// --- Background Precaching ---

var PRECACHE_VERSION_KEY = "precache-version";
var PRECACHE_CHECKPOINT_KEY = "checkpoint";
var _precachingActive = false;

async function getPrecacheMeta(key) {
  try {
    const db = await openDB("swoff-precache", 1, function(db) {
      if (!db.objectStoreNames.contains("progress"))
        db.createObjectStore("progress", { keyPath: "key" });
    });
    const tx = db.transaction("progress", "readonly");
    const store = tx.objectStore("progress");
    const entry = await new Promise(function(resolve, reject) {
      const req = store.get(key);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
    db.close();
    return entry ? entry.value : null;
  } catch(e) {
    return null;
  }
}

async function setPrecacheMeta(key, value) {
  try {
    const db = await openDB("swoff-precache", 1);
    const tx = db.transaction("progress", "readwrite");
    const store = tx.objectStore("progress");
    store.put({ key: key, value: value });
    await new Promise(function(resolve, reject) {
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function() { reject(tx.error); };
    });
    db.close();
  } catch(e) {}
}

async function getPrecacheCheckpoint() {
  var val = await getPrecacheMeta(PRECACHE_CHECKPOINT_KEY);
  return typeof val === "number" ? val : 0;
}

async function setPrecacheCheckpoint(index) {
  await setPrecacheMeta(PRECACHE_CHECKPOINT_KEY, index);
}

async function resetPrecacheCheckpoint() {
  await setPrecacheMeta(PRECACHE_CHECKPOINT_KEY, 0);
}

function computeAssetsVersion() {
  var s = "";
  for (var vi = 0; vi < ASSETS_TO_CACHE.length; vi++) {
    if (vi > 0) s += "|";
    s += ASSETS_TO_CACHE[vi];
  }
  var hash = 0;
  for (var ci = 0; ci < s.length; ci++) {
    var ch = s.charCodeAt(ci);
    hash = ((hash << 5) - hash) + ch;
    hash = hash | 0;
  }
  return hash.toString();
}

async function ensurePrecacheVersion() {
  var stored = await getPrecacheMeta(PRECACHE_VERSION_KEY);
  var current = computeAssetsVersion();
  if (stored !== current) {
    await setPrecacheMeta(PRECACHE_VERSION_KEY, current);
    await setPrecacheMeta(PRECACHE_CHECKPOINT_KEY, 0);
  }
}

async function startBackgroundPrecache() {
  if (_precachingActive) return;
  _precachingActive = true;
  try {
  await ensurePrecacheVersion();
  var cache = await caches.open("precache");
  var total = ASSETS_TO_CACHE.length;
  if (total === 0) return;

  var checkpoint = await getPrecacheCheckpoint();
  if (checkpoint >= total) return;

  var downloaded = 0;
  var attempted = 0;
  var i;

  for (i = 0; i < checkpoint && i < total; i++) {
    var m = await cache.match(ASSETS_TO_CACHE[i]);
    if (m) downloaded++;
  }
  attempted = checkpoint;

  for (i = checkpoint; i < total; i += PRECACHE_CONCURRENCY) {
    var allClients = await self.clients.matchAll({ includeUncontrolled: true });
    var batchEnd = Math.min(i + PRECACHE_CONCURRENCY, total);
    var promises = [];
    var batchFailed = false;
    for (var j = i; j < batchEnd; j++) {
      promises.push((function(url) {
        attempted++;
        return (async function() {
          try {
            var cached = await cache.match(url);
            if (cached) { downloaded++; return; }
            var request = new Request(url);
            await cache.add(request);
            downloaded++;
          } catch(err) {
            console.warn("Failed to precache " + url + ":", err);
            batchFailed = true;
          }
        })();
      })(ASSETS_TO_CACHE[j]));
      if (PRECACHE_DELAY_MS > 0) {
        await new Promise(function(resolve) { setTimeout(resolve, PRECACHE_DELAY_MS); });
      }
    }

    await Promise.all(promises);
    if (!batchFailed) {
      await setPrecacheCheckpoint(batchEnd);
    }

    var pct = Math.round((attempted / total) * 100);
    allClients.forEach(function(client) {
      client.postMessage({
        type: "SW_PROGRESS",
        percent: pct,
        downloaded: downloaded,
        total: total,
      });
    });

    await new Promise(function(resolve) { setTimeout(resolve, 0); });
  }

  await setPrecacheCheckpoint(total);
  } finally {
    _precachingActive = false;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    if (AUTO_SKIP_WAITING) self.skipWaiting();
  })());
});

const MAX_RUNTIME_CACHE_AGE = 2592000;


async function evictStaleRuntimeCache() {
  var cutoff = Date.now() - MAX_RUNTIME_CACHE_AGE * 1000;
  for (const name of ["swoff-runtime", "swoff-runtime-html"]) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
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
    try {
      await Promise.all(promises);
    } catch {}
  // Clean orphaned tag DB records
    try {
      const db = await openDB("swoff-cache-tags", 1, function(db) {
        if (!db.objectStoreNames.contains("tags")) {
          db.createObjectStore("tags", { keyPath: "url" });
        }
      });
      try {
        await pruneStaleStore(db, "tags", cutoff);
      } finally {
        db.close();
      }
    } catch {}
  }
}

async function checkCacheVersion() {
  const current = CACHE_NAME;
  let prev = null;
  try {
    const db = await openDB("swoff-meta", 1, function(db) {
      if (!db.objectStoreNames.contains("meta"))
        db.createObjectStore("meta", { keyPath: "key" });
    });
    const tx = db.transaction("meta", "readonly");
    const store = tx.objectStore("meta");
    const entry = await new Promise(function(resolve, reject) {
      const req = store.get("cacheName");
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
    prev = entry ? entry.value : null;
    db.close();
  } catch {}

  if (prev !== null && prev !== current) {
    await Promise.all(
      ["swoff-runtime", "swoff-runtime-html"].map(function(n) { return caches.delete(n); })
    );
  }

  try {
    const db = await openDB("swoff-meta", 1);
    const tx = db.transaction("meta", "readwrite");
    const store = tx.objectStore("meta");
    store.put({ key: "cacheName", value: current });
    await new Promise(function(resolve, reject) {
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function() { reject(tx.error); };
    });
    db.close();
  } catch {}
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (typeof clearAllReactive === "function") clearAllReactive();
      await checkCacheVersion();
      await self.clients.claim();
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await evictStaleRuntimeCache();
    })()
  );
  startBackgroundPrecache();
});

// --- Refetch Retry Config ---

const REFETCH_RETRY = {"maxRetries":3,"backoffMs":1000,"maxBackoffMs":10000,"jitterMs":100};

// --- Shared Backoff & Retry Helpers ---

function backoffDelay(attempt, config) {
  var delay = Math.min(config.backoffMs * Math.pow(2, attempt), config.maxBackoffMs);
  return delay + (config.jitterMs > 0 ? Math.random() * config.jitterMs : 0);
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function fetchWithRetry(request, retryConfig) {
  swLog("fetchWithRetry", "ENTER", request.url, 3);
  if (!retryConfig) return _fetchWithTimeout(null, request);
  for (var attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      var response = await _fetchWithTimeout(null, request);
      if (response.ok) {
        swLog("fetchWithRetry", "SUCCESS attempt=" + attempt, request.url, 3);
        return response;
      }
      if (response.status >= 400 && response.status < 500) {
        swLog("fetchWithRetry", "4xx skip retry status=" + response.status, request.url, 3);
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

// --- Batch Refresh Queue ---

var REFRESH_QUEUE = new Map();
var REFRESH_TIMER = null;
var REFRESH_RESOLVERS = new Map();

/**
 * Queue a URL for background refresh. Deduplicates by cache key.
 * URLs are processed in batches with rate limiting.
 * Returns a promise that resolves when the URL has been refreshed.
 */
function queueRefresh(url) {
  REFRESH_QUEUE.set(url, true);
  if (!REFRESH_TIMER) {
    REFRESH_TIMER = setTimeout(processRefreshQueue, 50);
  }
  if (!REFRESH_RESOLVERS.has(url)) {
    REFRESH_RESOLVERS.set(url, []);
  }
  var resolvers = REFRESH_RESOLVERS.get(url);
  return new Promise(function(resolve) {
    resolvers.push(resolve);
  });
}

async function processRefreshQueue() {
  if (REFRESH_TIMER) {
    clearTimeout(REFRESH_TIMER);
    REFRESH_TIMER = null;
  }
  if (REFRESH_QUEUE.size === 0) return;
  var urls = [...REFRESH_QUEUE.keys()];
  REFRESH_QUEUE.clear();
  var batch = [];
  for (var i = 0; i < urls.length; i++) {
    batch.push(urls[i]);
    if (batch.length >= 5 || i === urls.length - 1) {
      await Promise.all(batch.map(async function(url) {
        try {
          await refetchEntry(url);
        } catch {}
        var resolvers = REFRESH_RESOLVERS.get(url);
        if (resolvers) {
          REFRESH_RESOLVERS.delete(url);
          resolvers.forEach(function(r) { r(); });
        }
      }));
      batch = [];
      if (i < urls.length - 1 && 1000 > 0) {
        await sleep(1000);
      }
    }
  }
}


self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data.type === "FOCUS") {
    if (typeof handleRefetch === "function") handleRefetch("refetchOnFocus");
  }
  if (event.data.type === "ONLINE") {
    if (typeof handleRefetch === "function") handleRefetch("refetchOnReconnect");
  }
  if (event.data.type === "OFFLINE") {
    // Client went offline — the SW already serves from cache transparently.
    // No action needed; reactive refetches will resume on next ONLINE signal.
  }
  if (event.data.type === "RESUME_PRECACHE") {
    event.waitUntil(
      startBackgroundPrecache().catch(function(err) {
        console.error("Background precache error:", err);
      })
    );
  }
  if (event.data.type === "RESET_CACHE") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await resetPrecacheCheckpoint();
        const port = event.ports?.[0];
        port?.postMessage({ type: "RESET_CACHE_COMPLETE" });
      })(),
    );
    startBackgroundPrecache().catch(function(err) {
      console.error("Background precache error:", err);
    });
  }
  if (event.data.type === "AUTH_CLEARED") {
    event.waitUntil(broadcastToClients("AUTH_CLEARED"));
  }
});
// --- Mode & Strategy Configuration ---

const NAV_MODE = "ssr";
const FALLBACK_PATH = "/offline";
const DEFAULT_STRATEGY = "network-first";
const CUSTOM_STRATEGIES = {"/_serverFn/*":"network-only"};
const REACTIVE_STALE_DEFAULT = 0;
const FETCH_TIMEOUT_MS = 10000;
const SW_DEBUG = false;
const AUTH_ROUTES = ["/login","/logout","/register","/api/login","/api/logout","/api/register","/api/refresh","/api/me"];


// --- Debug Logging ---

function swLog(fn, msg, url, indent) {
  if (!SW_DEBUG) return;
  var prefix = "";
  for (var i = 0; i < (indent || 0); i++) prefix += "  ";
  console.log("[SW]" + prefix, fn + ":", msg, url || "", Date.now());
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
  return url.href;
}

// --- Cache Lookup ---

async function fromPrecache(request) {
  swLog("fromPrecache", "ENTER", request.url, 4);
  const cache = await caches.open("precache");
  const url = new URL(request.url);
  url.search = "";
  const result = await cache.match(url.href);
  swLog("fromPrecache", result ? "HIT" : "MISS", request.url, 4);
  return result;
}

async function fromRuntime(request) {
  swLog("fromRuntime", "ENTER", request.url, 4);
  const cache = await caches.open("swoff-runtime");
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
        const cache = await caches.open("precache");
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
      const htmlCache = await caches.open("swoff-runtime-html");
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
  const precache = await caches.open("precache");
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
    const cacheName = ct.startsWith("text/html") ? "swoff-runtime-html" : "swoff-runtime";
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
        for (const name of ["swoff-runtime", "swoff-runtime-html"]) {
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
  }
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
      const htmlCache = await caches.open("swoff-runtime-html");
      const htmlMatch = await htmlCache.match(cacheKey(request));
      if (htmlMatch) {
        swLog("fallback", "HIT runtime-html", request.url, 3);
        return htmlMatch;
      }
    }
  if (NAV_MODE !== "spa") {
    if (FALLBACK_PATH) {
      const cache = await caches.open("precache");
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

function inline503Response() {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Offline</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}div{text-align:center}h1{font-size:2rem;color:#333}p{color:#666}.sbtn{display:inline-block;margin-top:1.5rem;padding:.75rem 1.5rem;background:#4a90d9;color:#fff;border:none;border-radius:6px;font-size:1rem;cursor:pointer}.sbtn:hover{background:#357abd}.sbtn:disabled{opacity:.6;cursor:not-allowed}.sst{margin-top:.75rem;font-size:.875rem;color:#999}</style></head><body><div><h1>You&#39;re offline</h1><p>Please check your connection and try again.</p><button class="sbtn" id="sbtn">Reset &amp; Recover</button><p class="sst" id="sst"></p></div><script>document.getElementById("sbtn").onclick=async function(){var b=this,s=document.getElementById("sst"),i;b.disabled=true;s.textContent="Clearing data...";try{if(typeof caches!="undefined"){var k=await caches.keys();await Promise.all(k.map(function(x){return caches.delete(x)}))}var d=["swoff-auth","swoff-queue","swoff-cache-tags","swoff-push"];try{var a=await indexedDB.databases();if(a)for(i=0;i<a.length;i++){if(a[i].name&&a[i].name.indexOf("swoff-")===0&&d.indexOf(a[i].name)===-1)d.push(a[i].name)}}catch(e){}for(i=0;i<d.length;i++){try{indexedDB.deleteDatabase(d[i])}catch(e){}}try{localStorage.removeItem("swRegisteredVersion")}catch(e){}if("serviceWorker"in navigator&&navigator.serviceWorker.controller){var r=await navigator.serviceWorker.ready;if(r.active){await new Promise(function(rs){var c=new MessageChannel(),t=setTimeout(function(){c.port1.close();rs()},1e4);c.port1.onmessage=function(e){if(e.data.type==="RESET_CACHE_COMPLETE"){clearTimeout(t);rs()}};r.active.postMessage({type:"RESET_CACHE"},[c.port2])})}}s.textContent="Done! Reloading...";location.href="/"}catch(e){s.textContent="Reset failed: "+e.message;b.disabled=false}};</script></body></html>`,
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
  if (staleTimeSeconds == null) return false;
  if (staleTimeSeconds === 0) return true;
  if (staleTimeSeconds < 0) return false;
  const cachedAt = response.headers.get("X-SW-Cached-At");
  if (!cachedAt) return false;
  return Date.now() - Number(cachedAt) > staleTimeSeconds * 1000;
}

// --- Fetch Helpers ---

// Strips internal X-SW-* headers so they never leak to external servers.
function _stripSWHeaders(request) {
  var headers = new Headers(request.headers);
  for (var key of headers.keys()) {
    if (key.toLowerCase().indexOf("x-sw-") === 0) {
      headers.delete(key);
    }
  }
  return new Request(request, { headers: headers });
}

async function _fetchWithTimeout(_, request, timeoutMs) {
  timeoutMs = timeoutMs || FETCH_TIMEOUT_MS;
  swLog("_fetchWithTimeout", "ENTER timeout=" + timeoutMs, request.url, 3);
  const controller = new AbortController();
  const id = setTimeout(function() { controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(_stripSWHeaders(request), { signal: controller.signal });
    swLog("_fetchWithTimeout", "SUCCESS " + response.status, request.url, 3);
    return response;
  } catch (e) {
    swLog("_fetchWithTimeout", "FAILED", request.url, 3);
    throw e;
  } finally {
    clearTimeout(id);
  }
}


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
  return _fetchWithTimeout(event, request, timeoutMs);
}
const _fetch = fetchWithPreload;

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

var REACTIVE_ENTRIES = new Map();
var REACTIVE_INTERVALS = new Map();
var clearAllReactive = function() {
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

async function checkAuthFailure(response) {
  if (response && isAuthFailureResponse(response)) {
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

  event.waitUntil(queueRefresh(cacheKey(request)));

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
    swLog("_executeStrategy", "ERROR strategy=" + config.strategy, request.url, 1);
    return fallback(request);
  }
}

function applyStrategy(event, request, config) {
  event.respondWith(_executeStrategy(event, request, config));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  swLog("fetch", "INCOMING", request.url, 0);
  if (AUTH_ROUTES.some(function(route) { return new URL(request.url).pathname.includes(route); })) {
    swLog("fetch", "auth-route-bypass", request.url, 0);
    return;
  }
  if (request.headers.get("X-SW-Strategy") === "network-only") {
    swLog("fetch", "strategy=network-only", request.url, 0);
    return;
  }
  if (request.method !== "GET") {
    if (!request.headers.get("X-SW-Cache-Key")) { return; }
  }
  const cfg = determineCacheStrategy(request);
  swLog("fetch", "strategy=" + cfg.strategy, request.url, 0);
  if (cfg.strategy === "reactive") {
    registerReactiveEntry(cacheKey(request), request.url, cfg);
  }
  applyStrategy(event, request, cfg);
  startBackgroundPrecache();
});



let CACHE_NAME = "";
let ASSETS_TO_CACHE = [];