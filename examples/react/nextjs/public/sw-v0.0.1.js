// [[HEADER]]

let CACHE_NAME = "";
let ASSETS_TO_CACHE = [];

CACHE_NAME = 'sw-v0.0.1'
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
    "url": "/_next/static/Kp5b0WvIA3sCvFvyC8uYl/_buildManifest.js",
    "options": {}
  },
  {
    "url": "/_next/static/Kp5b0WvIA3sCvFvyC8uYl/_clientMiddlewareManifest.js",
    "options": {}
  },
  {
    "url": "/_next/static/Kp5b0WvIA3sCvFvyC8uYl/_ssgManifest.js",
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
    "url": "/_next/static/chunks/05l69mfoo73_j.js",
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
    "url": "/_next/static/chunks/0gepdu7b4~c.d.css",
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

const SW_DEBUG = false;
function swLog(fn, msg, url) {
  if (!SW_DEBUG) return;
  console.log("[SW][" + fn + "]", msg, url || "", Date.now());
}

const CACHE_NAME_RUNTIME = "swoff-runtime";
const CACHE_NAME_RUNTIME_HTML = "swoff-runtime-html";


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
  swLog("install", "SW installing online=" + navigator.onLine);
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
  swLog("activate", "SW activating online=" + navigator.onLine);
  event.waitUntil(
    (async () => {
      swLog("activate", "claiming clients + enabling navPreload", "");
      await self.clients.claim();
      if (self.registration.navigationPreload) {
        swLog("activate", "navigationPreload ENABLED", "");
        await self.registration.navigationPreload.enable();
      }
      await evictStaleRuntimeCache();
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== CACHE_NAME_RUNTIME && key !== CACHE_NAME_RUNTIME_HTML).map((key) => caches.delete(key))
      );
      swLog("activate", "activation complete", "");
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
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
  if (event.data.type === "ONLINE") {
    event.waitUntil(handleOnline());
  }
  if (event.data.type === "FOCUS") {
    event.waitUntil(handleOnFocus());
  }

});
const NAV_MODE = "ssr";

const FALLBACK_PATH = "/offline.html";


const NAV_RETRY_ENABLED = true;
const NAV_RETRY_INTERVAL_MS = 3000;
const NAV_RETRY_MAX_RETRIES = 5;

// --- Smart Navigation Retry ---

function startRetryLoop(event, request) {
  swLog("startRetryLoop", "entering NAV_RETRY_ENABLED=" + NAV_RETRY_ENABLED + " scheduling first retry in " + NAV_RETRY_INTERVAL_MS + "ms", request.url);
  if (!NAV_RETRY_ENABLED) return;
  let retries = 0;
  const retry = async () => {
    swLog("startRetryLoop.retry", "attempt " + (retries + 1) + "/" + NAV_RETRY_MAX_RETRIES + " online=" + navigator.onLine, request.url);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      swLog("startRetryLoop.retry", "BEFORE fetch() timeout=" + FETCH_TIMEOUT_MS + "ms", request.url);
      const response = await fetch(request.clone(), { signal: controller.signal });
      clearTimeout(id);
      swLog("startRetryLoop.retry", "AFTER fetch() status=" + response.status, request.url);
      if (response.ok) {
        swLog("startRetryLoop.retry", "SUCCESS caching page", request.url);
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
      swLog("startRetryLoop.retry", "CATCH fetch failed", request.url);
    }
    retries++;
    if (retries < NAV_RETRY_MAX_RETRIES) {
      const delay = NAV_RETRY_INTERVAL_MS * Math.pow(2, retries - 1);
      swLog("startRetryLoop.retry", "scheduling retry " + (retries + 1) + " in " + Math.min(delay, 30000) + "ms", request.url);
      setTimeout(retry, Math.min(delay, 30000));
    } else {
      swLog("startRetryLoop.retry", "MAX RETRIES reached, giving up", request.url);
    }
  };
  setTimeout(retry, NAV_RETRY_INTERVAL_MS);
}
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
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
          fetchOpts.signal = controller.signal;
          const response = await fetch(fetchUrl, fetchOpts);
          clearTimeout(id);
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

const REACTIVE_PATTERNS = [];

const GLOBAL_REACTIVE_DEFAULTS = {"staleTime":0,"refetchInterval":0,"refetchOnReconnect":false,"refetchOnFocus":false};

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
  const key = request.headers.get("X-SW-Cache-Key");
  if (key) return new URL("/__swc/" + key, self.location.origin).href;
  const url = new URL(request.url);
  const origHref = url.href;
  const ignore = ["_rsc"];
  if (url.search) {
    const params = new URLSearchParams(url.search);
    for (const key of ignore) params.delete(key);
    url.search = params.toString();
  }
  const result = url.href;
  swLog("cacheKey", origHref + " -> " + result);
  return result;
}

// --- Cache Helpers ---

async function fromPrecache(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  url.search = "";
  const result = await cache.match(url.href);
  swLog("fromPrecache", result ? "HIT" : "MISS", request.url);
  return result;
}

async function fromRuntime(request) {
  const cache = await caches.open(CACHE_NAME_RUNTIME);
  const result = await cache.match(cacheKey(request));
  swLog("fromRuntime", result ? "HIT" : "MISS", request.url);
  return result;
}

async function handleSpaNavigation(event, request) {
  swLog("handleSpaNavigation", "entering FALLBACK_PATH=" + FALLBACK_PATH, request.url);
  if (FALLBACK_PATH) {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(FALLBACK_PATH);
    if (match) {
      swLog("handleSpaNavigation", "SERVING offline fallback", request.url);
      const clients = await self.clients.matchAll();
      for (const client of clients) {
        client.postMessage({
          type: "OFFLINE_FALLBACK_ACTIVATED",
          detail: { route: new URL(request.url).pathname, fallbackLevel: "offline-page", timestamp: Date.now() },
        });
      }
      return match;
    }
    swLog("handleSpaNavigation", "FALLBACK_PATH not in cache", request.url);
  }
  swLog("handleSpaNavigation", "SERVING inline 503", request.url);
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
  swLog("serveFromCache", "entering mode=" + request.mode + " navMode=" + NAV_MODE, request.url);
  if (request.mode === "navigate") {
    if (NAV_MODE === "spa") {
      swLog("serveFromCache", "SPA mode -> handleSpaNavigation", request.url);
      return handleSpaNavigation(event, request);
    }
    const pc = await caches.open(CACHE_NAME);
    const pUrl = new URL(request.url);
    pUrl.search = "";
    const precached = await pc.match(pUrl.href);
    swLog("serveFromCache", "precache match=" + (precached ? "HIT" : "MISS"), request.url);
    if (precached) return precached;
    const htmlCache = await caches.open(CACHE_NAME_RUNTIME_HTML);
    const htmlMatch = await htmlCache.match(cacheKey(request));
    swLog("serveFromCache", "runtime-html match=" + (htmlMatch ? "HIT" : "MISS"), request.url);
    if (htmlMatch) return htmlMatch;
    swLog("serveFromCache", "navigate cache MISS, returning null", request.url);
    return null;
  }
  const cached = await fromRuntime(request);
  if (cached) {
    swLog("serveFromCache", "runtime HIT", request.url);
    return cached;
  }
  swLog("serveFromCache", "runtime MISS, trying precache", request.url);
  return fromPrecache(request);
}

async function storeRuntime(request, response) {
  swLog("storeRuntime", "entering contentType=" + (response.headers.get("Content-Type") || ""), request.url);
  if (request.mode === "navigate" && NAV_MODE === "spa") { swLog("storeRuntime", "SKIP spa navigate", request.url); return; }
  const key = cacheKey(request);
  const precache = await caches.open(CACHE_NAME);
  const checkUrl = new URL(key);
  checkUrl.search = "";
  if (await precache.match(checkUrl.href)) { swLog("storeRuntime", "SKIP already in precache", request.url); return; }
  const ct = response.headers.get("Content-Type") || "";
  const cacheName = ct.startsWith("text/html") ? CACHE_NAME_RUNTIME_HTML : CACHE_NAME_RUNTIME;
  swLog("storeRuntime", "storing in " + cacheName + " key=" + key, request.url);
  const cache = await caches.open(cacheName);
  const headers = new Headers(response.headers);
  headers.set("X-SW-Cached-At", String(Date.now()));
  const cloned = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(key, cloned);
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
  swLog("inline503Response", "SERVING inline 503");
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Offline</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}div{text-align:center}h1{font-size:2rem;color:#333}p{color:#666}</style></head><body><div><h1>You're offline</h1><p>Please check your connection and try again.</p></div></body></html>`,
    { status: 503, headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } }
  );
}

async function fromUltimateFallback(event, request) {
  swLog("fromUltimateFallback", "entering isNav=" + (request.mode === "navigate"), request.url);
  const isNav = request.mode === "navigate";

  if (isNav && NAV_RETRY_ENABLED) {
    swLog("fromUltimateFallback", "starting retry loop", request.url);
    event.waitUntil(startRetryLoop(event, request));
  }

  if (FALLBACK_PATH) {
    swLog("fromUltimateFallback", "checking fallback path=" + FALLBACK_PATH, request.url);
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(FALLBACK_PATH);
    swLog("fromUltimateFallback", "offline.html in cache=" + (match ? "FOUND" : "MISS"), request.url);
    if (match) {
      const clients = await self.clients.matchAll();
      for (const client of clients) {
        client.postMessage({
          type: "OFFLINE_FALLBACK_ACTIVATED",
          detail: { route: new URL(request.url).pathname, fallbackLevel: "offline-page", timestamp: Date.now() },
        });
      }
      swLog("fromUltimateFallback", "SERVING offline.html", request.url);
      return match;
    }
  }
  swLog("fromUltimateFallback", "SERVING inline 503", request.url);
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({
      type: "OFFLINE_FALLBACK_ACTIVATED",
      detail: { route: new URL(request.url).pathname, fallbackLevel: "inline-503", timestamp: Date.now() },
    });
  }
  return inline503Response();
}

  // 1. Per-route fallback (from navigation rules)
  // 2. Global fallback from precache
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
  // 3. Inline 503
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
  swLog("markFromCache", "marking status=" + response.status);
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
    swLog("determineCacheStrategy", "header override=" + override, request.url);
    return { strategy: override };
  }
  const path = new URL(request.url).pathname;
  for (const [pattern, entry] of Object.entries(customStrategies)) {
    if (matchGlob(path, pattern)) {
      const resolved = resolveStrategyEntry(entry);
      const cfg = { strategy: resolved.strategy };
      swLog("determineCacheStrategy", "pattern match " + pattern + " -> " + cfg.strategy, request.url);
      if (resolved.strategy === "reactive") {
        const reactive = findReactiveConfig(new URL(request.url).href);
        if (reactive) {
          cfg.staleTime = reactive.staleTime;
          cfg.refetchOnFocus = reactive.refetchOnFocus;
          cfg.refetchOnReconnect = reactive.refetchOnReconnect;
        }
      }
      return cfg;
    }
  }
  const cfg = { strategy: globalDefaults.defaultStrategy };
  swLog("determineCacheStrategy", "default=" + cfg.strategy, request.url);
  if (globalDefaults.defaultStrategy === "reactive") {
    cfg.staleTime = GLOBAL_REACTIVE_DEFAULTS.staleTime;
    cfg.refetchOnFocus = GLOBAL_REACTIVE_DEFAULTS.refetchOnFocus;
    cfg.refetchOnReconnect = GLOBAL_REACTIVE_DEFAULTS.refetchOnReconnect;
  }
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

function _fetchWithTimeout(request) {
  swLog("_fetchWithTimeout", "entering", request.url);
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(id));
}

async function handleMutation(event) {
  const request = event.request;
  swLog("handleMutation", "entering method=" + request.method, request.url);
  if (request.headers.get("X-SW-No-Queue") === "true") {
    swLog("handleMutation", "no-queue mode", request.url);
    try {
      return await _fetchWithTimeout(request.clone());
    } catch {
      throw new Error("Mutation failed (no-queue mode)");
    }
  }
  swLog("handleMutation", "before _fetchWithTimeout", request.url);
  try {
    return await _fetchWithTimeout(request.clone());
  } catch {
    swLog("handleMutation", "CATCH -> queuing mutation", request.url);
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
  swLog("fetch", "INCOMING", request.url);
  swLog("fetch", "method=" + request.method + " mode=" + request.mode + " destination=" + request.destination + " online=" + navigator.onLine);
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (request.headers.get("X-SW-Cache-Strategy") === "mutation") {
      swLog("fetch", "ROUTE mutation handler", request.url);
      event.respondWith(handleMutation(event));
      return;
    }
    if (!request.headers.get("X-SW-Cache-Key")) { swLog("fetch", "SKIP no cache key", request.url); return; }
  }
  const strat = determineCacheStrategy(event.request, {"/api/*":"network-first","/static/*":"cache-first","/_next/*":"cache-first"}, { defaultStrategy: "network-first" });
  swLog("fetch", "strategy=" + strat.strategy, request.url);
  applyStrategy(event, request, strat);
});

// --- Strategies ---

const FETCH_TIMEOUT_MS = 10000;

// --- ETag Conditional Fetch ---
// Transparently handles If-None-Match/304 so strategies always see a 200 response.

async function _fetchWithConditional(request) {
  swLog("_fetchWithConditional", "entering online=" + navigator.onLine, request.url);
  let cached;
  if (!(request.mode === "navigate" && NAV_MODE === "spa")) {
    const cache = await caches.open(CACHE_NAME_RUNTIME);
    cached = await cache.match(cacheKey(request));
    swLog("_fetchWithConditional", "runtime cache match=" + (cached ? "HIT" : "MISS"), request.url);
    if (!cached && request.mode === "navigate") {
      const htmlCache = await caches.open(CACHE_NAME_RUNTIME_HTML);
      cached = await htmlCache.match(cacheKey(request));
      swLog("_fetchWithConditional", "html cache match=" + (cached ? "HIT" : "MISS"), request.url);
    }
  }
  const etag = cached?.headers.get("ETag");
  if (etag) {
    swLog("_fetchWithConditional", "etag=" + etag + " adding If-None-Match", request.url);
    request = new Request(request, {
      headers: Object.assign(Object.fromEntries(request.headers.entries()), { "If-None-Match": etag }),
    });
  }
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    swLog("_fetchWithConditional", "BEFORE fetch() timeout=" + FETCH_TIMEOUT_MS + "ms", request.url);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(id);
    swLog("_fetchWithConditional", "AFTER fetch() status=" + response.status, request.url);
    if (response.status === 304 && cached) {
      swLog("_fetchWithConditional", "304 -> serving cached response", request.url);
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
    swLog("_fetchWithConditional", "CATCH fetch() FAILED, throwing", request.url);
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


async function fetchWithPreload(event, request) {
  swLog("fetchWithPreload", "entering online=" + navigator.onLine, request.url);
  try {
    swLog("fetchWithPreload", "awaiting preloadResponse...", request.url);
    const preload = await event.preloadResponse;
    swLog("fetchWithPreload", "preloadResponse resolved preload=" + (preload ? "present" : "absent"), request.url);
    if (preload) return preload;
  } catch (e) {
    swLog("fetchWithPreload", "preloadResponse REJECTED: " + e, request.url);
  }
  swLog("fetchWithPreload", "falling through to _fetchWithConditional", request.url);
  return _fetchWithConditional(request);
}
const _fetch = fetchWithPreload;

async function cacheFirst(event, request) {
  swLog("cacheFirst", "entering", request.url);
  const cached = await serveFromCache(event, request);
  if (cached) {
    swLog("cacheFirst", "cache HIT", request.url);
    cleanStaleVersions();
    if (staleVersions.has(cacheKey(request))) {
      queueRefresh(cacheKey(request), new URL(request.url).href);
    }
    return markFromCache(cached);
  }
  swLog("cacheFirst", "cache MISS -> _fetch", request.url);
  const response = await _fetch(event, request);
  if (response && response.ok) {
    const responseToCache = response.clone();
    event.waitUntil(cacheResponse(request.clone(), responseToCache));
  }
  return response;
}

async function networkFirst(event, request) {
  swLog("networkFirst", "entering online=" + navigator.onLine, request.url);
  try {
    const reqForCache = request.clone();
    swLog("networkFirst", "before _fetch", request.url);
    const response = await _fetch(event, request);
    swLog("networkFirst", "_fetch succeeded status=" + response.status, request.url);
    if (response.ok) {
      const responseToCache = response.clone();
      event.waitUntil(cacheResponse(reqForCache, responseToCache));
    }
    return response;
  } catch {
    swLog("networkFirst", "CATCH _fetch failed -> serveFromCache", request.url);
    const cached = await serveFromCache(event, request);
    if (cached) {
      swLog("networkFirst", "serveFromCache HIT", request.url);
      return markFromCache(cached);
    }

    swLog("networkFirst", "serveFromCache MISS -> throwing", request.url);
    throw new Error("Network request failed and no cached response available");
  }
}

async function staleWhileRevalidate(event, request) {
  swLog("staleWhileRevalidate", "entering", request.url);
  const cached = await serveFromCache(event, request);
  if (cached) {
    swLog("staleWhileRevalidate", "cache HIT, bg refresh", request.url);
    event.waitUntil(queueRefresh(cacheKey(request), new URL(request.url).href));
    return markFromCache(cached);
  }
  swLog("staleWhileRevalidate", "cache MISS -> _fetch", request.url);
  const reqForCache = request.clone();
  const response = await _fetch(event, request);
  if (response.ok) {
    const responseToCache = response.clone();
    await cacheResponse(reqForCache, responseToCache);
  }
  return response;
}

async function reactiveStrategy(event, request, staleTime) {
  swLog("reactiveStrategy", "entering", request.url);
  const headerStale = request.headers.get("X-SW-Stale-Time");
  const effectiveStaleTime = headerStale !== null ? Number(headerStale) : staleTime;
  const cached = await serveFromCache(event, request);
  if (cached) {
    swLog("reactiveStrategy", "cache HIT, checking stale", request.url);
    cleanStaleVersions();
    if (staleVersions.has(cacheKey(request))) {
      queueRefresh(cacheKey(request), new URL(request.url).href);
    }
    if (shouldReactiveRefresh(cached, { staleTime: effectiveStaleTime })) {
      event.waitUntil(queueRefresh(cacheKey(request), new URL(request.url).href));
    }
    return markFromCache(cached);
  }
  swLog("reactiveStrategy", "cache MISS -> _fetch", request.url);
  const reqForCache = request.clone();
  const response = await _fetch(event, request);
  if (response.ok) {
    const responseToCache = response.clone();
    await cacheResponse(reqForCache, responseToCache);
  }
  return response;
}

async function cacheOnly(event, request) {
  swLog("cacheOnly", "entering", request.url);
  const cached = await serveFromCache(event, request);
  if (cached) {
    swLog("cacheOnly", "HIT", request.url);
    cleanStaleVersions();
    if (staleVersions.has(cacheKey(request))) {
      queueRefresh(cacheKey(request), new URL(request.url).href);
    }
    return markFromCache(cached);
  }
  swLog("cacheOnly", "MISS -> 404", request.url);
  return new Response("Not in cache", { status: 404 });
}

async function networkOnly(event, request) {
  swLog("networkOnly", "entering -> _fetch", request.url);
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
  const rscCache = await caches.open(CACHE_NAME_RUNTIME_HTML);
  for (const entry of entries) {
    await rscCache.delete(entry.url);
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

    // Pre-filter: remove permanently failed items first, then filter for processable ones
    const now = Date.now();
    for (const item of queue) {
      if (item.retryCount >= SW_MAX_RETRIES) {
        await removeFromSWQueue(db, item.id);
        failed++;
      }
    }
    const processable = queue.filter(item => {
      if (item.retryCount >= SW_MAX_RETRIES) return false;
      return !item.nextRetryAt || now >= item.nextRetryAt;
    });
    const total = processable.length;

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
