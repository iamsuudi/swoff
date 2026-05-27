/**
 * Generates the SW fetch event handler with all caching strategies.
 *
 * Strategy dispatch tiers (highest to lowest priority):
 *   1. X-SW-Strategy header — per-request override from fetchWithCache({ strategy })
 *   2. URL pattern match — from features.serviceWorker.strategies in swoff.config.json
 *   3. defaultStrategy — fallback from features.serviceWorker.defaultStrategy
 *
 * Each tier also carries: staleTime, maxCacheEntries, maxCacheAge
 * Per-request values override route values, which override globals.
 *
 * With staleTime enabled, every strategy gains a "fresh" window:
 *   - cache-first: returns cached immediately, background refresh if stale
 *   - network-first: skips network if fresh, tries network if stale
 *   - stale-while-revalidate: skips refresh if fresh, refreshes if stale
 *   - cache-only: background refresh if stale (best effort)
 *   - network-only: unaffected (never caches)
 */

export function generateFetchHandler(
  swConfig: { defaultStrategy: string; strategies: Record<string, string | { strategy: string; maxCacheEntries?: number; maxCacheAge?: number; staleTime?: number }>; cacheStrategy?: "all" | "explicit-only"; staleTime?: number; maxCacheEntries?: number; maxCacheAge?: number; navigationPreload?: boolean; navigationMode?: string; spaEntry?: string },
  tagInvalidation: boolean,
): string {
  const { defaultStrategy, strategies, cacheStrategy = "all", staleTime, maxCacheEntries, maxCacheAge, navigationPreload, navigationMode, spaEntry } = swConfig;

  const navMode = navigationMode ?? "spa";
  const spaPath = spaEntry ?? "/index.html";

  const staleVersionCode = tagInvalidation ? `
    cleanStaleVersions();
    if (staleVersions.has(cacheKey(request))) {
      event.waitUntil(refreshCache(request).then(() => staleVersions.delete(cacheKey(request))));
    }` : "";

  const tagCode = tagInvalidation ? `
  const tagsHeader = request.headers.get("X-SW-Cache-Tags");
  if (tagsHeader) {
    const cacheKeyUrl = cacheKey(request);
    const actualUrl = new URL(request.url).href;
    const tags = tagsHeader.split(",").map((t) => t.trim());
    await cacheTagUrl(cacheKeyUrl, actualUrl, tags);
  }` : "";

  const trimDecl = `const GLOBAL_MAX_ENTRIES = ${maxCacheEntries ?? 0};
const GLOBAL_MAX_AGE = ${maxCacheAge ?? 0};
const GLOBAL_STALE_TIME = ${staleTime ?? 0};`;

  return `${trimDecl}
// --- Cache Key ---

function cacheKey(request) {
  const key = request.headers.get("X-SW-Cache-Key");
  if (key) return new URL("/__swc/" + key, self.location.origin).href;
  return new URL(request.url).href;
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
      staleTime: Number(request.headers.get("X-SW-Stale-Time")) || globalDefaults.staleTime,
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
        staleTime: resolved.staleTime ?? globalDefaults.staleTime,
        maxCacheEntries: resolved.maxCacheEntries ?? globalDefaults.maxCacheEntries,
        maxCacheAge: resolved.maxCacheAge ?? globalDefaults.maxCacheAge,
      };
    }
  }
  return {
    strategy: globalDefaults.defaultStrategy,
    staleTime: globalDefaults.staleTime,
    maxCacheEntries: globalDefaults.maxCacheEntries,
    maxCacheAge: globalDefaults.maxCacheAge,
  };
}

function applyStrategy(event, request, config) {
  const { strategy, staleTime, maxCacheEntries, maxCacheAge } = config;
  if (strategy === "stale-while-revalidate") {
    event.respondWith(staleWhileRevalidate(event, request, staleTime, maxCacheEntries, maxCacheAge));
  } else if (strategy === "network-first") {
    event.respondWith(networkFirst(event, request, staleTime, maxCacheEntries, maxCacheAge));
  } else if (strategy === "cache-only") {
    event.respondWith(cacheOnly(event, request, staleTime, maxCacheEntries, maxCacheAge));
  } else if (strategy === "network-only") {
    event.respondWith(networkOnly(event, request));
  } else {
    event.respondWith(cacheFirst(event, request, staleTime, maxCacheEntries, maxCacheAge));
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (!request.headers.get("X-SW-Cache-Key")) return;
  }
  ${cacheStrategy === "explicit-only" ? `if (!request.headers.get("X-SW-Cache-Strategy")) return;` : ""}
  applyStrategy(event, request, determineCacheStrategy(event.request, ${JSON.stringify(strategies)}, { defaultStrategy: "${defaultStrategy}", staleTime: GLOBAL_STALE_TIME, maxCacheEntries: GLOBAL_MAX_ENTRIES, maxCacheAge: GLOBAL_MAX_AGE }));
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

async function cacheFirst(event, request, staleTime, maxEntries, maxAge) {
  const cached = await fromRuntime(request);
  if (cached) {${staleVersionCode}
    if (isStale(cached, staleTime)) {
      event.waitUntil(refreshCache(request));
    }
    return markFromCache(cached);
  }

  const precached = await fromPrecache(request);
  if (precached) return markFromCache(precached);

  const fallback = await fromSpaFallback(request);
  if (fallback) return fallback;

  const response = await _fetch(event, request);
  if (response.ok) {
    event.waitUntil(
      (async () => {
        await cacheResponse(request, response);
        _trim(CACHE_NAME_RUNTIME, maxEntries, maxAge);
      })(),
    );
  }
  return response;
}

async function networkFirst(event, request, staleTime, maxEntries, maxAge) {
  // If cached and fresh (within staleTime), skip network entirely
  if (staleTime > 0) {
    const cached = await fromRuntime(request);
    if (cached && !isStale(cached, staleTime)) {
      return markFromCache(cached);
    }
  }

  try {
    const response = await _fetch(event, request);
    if (response.ok) {
      event.waitUntil(
        (async () => {
          await cacheResponse(request, response);
          _trim(CACHE_NAME_RUNTIME, maxEntries, maxAge);
        })(),
      );
    }
    return response;
  } catch {
    const cached = await fromRuntime(request);
    if (cached) return cached;

    const precached = await fromPrecache(request);
    if (precached) return precached;

    const fallback = await fromSpaFallback(request);
    if (fallback) return fallback;

    throw new Error("Request failed and no cached response available");
  }
}

async function staleWhileRevalidate(event, request, staleTime, maxEntries, maxAge) {
  const cached = await fromRuntime(request);
  if (cached) {
    // Skip background refresh if still fresh
    if (!isStale(cached, staleTime)) {
      return markFromCache(cached);
    }
    event.waitUntil(refreshCache(request));
    return markFromCache(cached);
  }

  const precached = await fromPrecache(request);
  if (precached) {
    event.waitUntil(refreshCache(request));
    return markFromCache(precached);
  }

  const response = await _fetch(event, request);
  if (response.ok) {
    await cacheResponse(request, response);
    _trim(CACHE_NAME_RUNTIME, maxEntries, maxAge);
  }
  return response;
}

async function refreshCache(request) {
  try {
    const key = request.headers.get("X-SW-Cache-Key");
    const fetchRequest = key ? new Request(new URL(request.url).href, { method: request.method, headers: request.headers, body: request.method !== "GET" ? request.body : undefined }) : request;
    const response = await fetch(fetchRequest);
    if (response.ok) {
      await storeRuntime(request, response);
    }
  } catch {
    // Background refresh failed - stale cache remains usable
  }
}

async function cacheOnly(event, request, staleTime, maxEntries, maxAge) {
  const cached = await fromRuntime(request);
  if (cached) {${staleVersionCode}
    if (isStale(cached, staleTime)) {
      event.waitUntil(refreshCache(request));
    }
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
      const dateHeader = response?.headers.get("date");
      if (dateHeader) {
        const age = now - new Date(dateHeader).getTime();
        if (age > _maxAge) {
          await cache.delete(request);
        }
      }
    }
  }
}
`;
}
