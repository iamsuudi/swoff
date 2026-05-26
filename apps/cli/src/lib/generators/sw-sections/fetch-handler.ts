/**
 * Generates the SW fetch event handler with all caching strategies.
 *
 * Strategy dispatch tiers (highest to lowest priority):
 *   1. X-SW-Strategy header — per-request override from fetchWithCache({ strategy })
 *   2. URL pattern match — from features.serviceWorker.strategies in swoff.config.json
 *   3. defaultStrategy — fallback from features.serviceWorker.defaultStrategy
 *
 * Cache strategy mode (features.serviceWorker.cacheStrategy):
 *   "all"           — all GET/HEAD requests go through the strategy system (default)
 *   "explicit-only" — only requests with X-SW-Cache-Strategy header go through strategy;
 *                     plain fetch() calls pass through the SW unmodified
 *
 * Request dispatch flow:
 *   navigation (SPA fallback) → precache → strategy (if applicable) → pass-through
 */

export function generateFetchHandler(
  swConfig: { defaultStrategy: string; strategies: Record<string, string>; cacheStrategy?: "all" | "explicit-only"; maxCacheEntries?: number; maxCacheAge?: number; navigationMode?: string; spaEntry?: string },
  tagInvalidation: boolean,
): string {
  const { defaultStrategy, strategies, cacheStrategy = "all", maxCacheEntries, maxCacheAge, navigationMode, spaEntry } = swConfig;

  const hasTrim = (maxCacheEntries ?? 0) > 0 || (maxCacheAge ?? 0) > 0;
  const navMode = navigationMode ?? "spa";
  const spaPath = spaEntry ?? "/index.html";

  const staleVersionCode = tagInvalidation ? `
    cleanStaleVersions();
    if (staleVersions.has(request.url)) {
      event.waitUntil(refreshCache(request).then(() => staleVersions.delete(request.url)));
    }` : "";

  const tagCode = tagInvalidation ? `
  const tagsHeader = request.headers.get("X-SW-Cache-Tags");
  if (tagsHeader) {
    const url = new URL(request.url).href;
    const tags = tagsHeader.split(",").map((t) => t.trim());
    await cacheTagUrl(url, tags);
  }` : "";

  const trimCode = hasTrim ? `  await trimRuntimeCache(CACHE_NAME_RUNTIME);\n` : "";

  const trimFunction = hasTrim ? `
const MAX_CACHE_ENTRIES = ${maxCacheEntries ?? 0};
const MAX_CACHE_AGE = ${maxCacheAge ?? 0};

async function trimRuntimeCache(cacheName) {
  const cache = await caches.open(cacheName);

  if (MAX_CACHE_ENTRIES > 0) {
    const keys = await cache.keys();
    if (keys.length >= MAX_CACHE_ENTRIES) {
      const toDelete = keys.slice(0, keys.length - MAX_CACHE_ENTRIES + 1);
      await Promise.all(toDelete.map((key) => cache.delete(key)));
    }
  }

  if (MAX_CACHE_AGE > 0) {
    const keys = await cache.keys();
    const now = Date.now();
    for (const request of keys) {
      const response = await cache.match(request);
      const dateHeader = response?.headers.get("date");
      if (dateHeader) {
        const age = now - new Date(dateHeader).getTime();
        if (age > MAX_CACHE_AGE) {
          await cache.delete(request);
        }
      }
    }
  }
}
` : "";

  return `${trimFunction}
// --- Cache Helpers ---

async function fromPrecache(request) {
  const cache = await caches.open(CACHE_NAME);
  return cache.match(new URL(request.url).pathname);
}

async function fromRuntime(request) {
  const cache = await caches.open(CACHE_NAME_RUNTIME);
  return cache.match(new URL(request.url).href);
}

async function storeRuntime(request, response) {
  const cache = await caches.open(CACHE_NAME_RUNTIME);
  await cache.put(new URL(request.url).href, response.clone());
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

// --- Strategy Selection ---

function determineCacheStrategy(request, customStrategies, defaultStrategy) {
  const override = request.headers.get("X-SW-Strategy");
  if (override) return override;
  const path = new URL(request.url).pathname;
  for (const [pattern, strategy] of Object.entries(customStrategies)) {
    if (path.startsWith(pattern.replace("*", ""))) return strategy;
  }
  return defaultStrategy;
}

function applyStrategy(event, request, strategy) {
  if (strategy === "stale-while-revalidate") {
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

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" && request.method !== "HEAD") return;
  ${cacheStrategy === "explicit-only" ? `if (!request.headers.get("X-SW-Cache-Strategy")) return;` : ""}
  applyStrategy(event, request, determineCacheStrategy(event.request, ${JSON.stringify(strategies)}, "${defaultStrategy}"));
});

// --- Strategies ---

async function cacheFirst(event, request) {
  const cached = await fromRuntime(request);
  if (cached) {${staleVersionCode}
    return markFromCache(cached);
  }

  const precached = await fromPrecache(request);
  if (precached) return markFromCache(precached);

  const fallback = await fromSpaFallback(request);
  if (fallback) return fallback;

  const response = await fetch(request);
  if (response.ok) {
    event.waitUntil(
      (async () => {
        await cacheResponse(request, response);
${trimCode}      })(),
    );
  }
  return response;
}

async function networkFirst(event, request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      event.waitUntil(
        (async () => {
          await cacheResponse(request, response);
${trimCode}        })(),
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

async function staleWhileRevalidate(event, request) {
  const cached = await fromRuntime(request);
  if (cached) {
    event.waitUntil(refreshCache(request));
    return markFromCache(cached);
  }

  const precached = await fromPrecache(request);
  if (precached) {
    event.waitUntil(refreshCache(request));
    return markFromCache(precached);
  }

  const response = await fetch(request);
  if (response.ok) {
    await cacheResponse(request, response);
${trimCode}  }
  return response;
}

async function refreshCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await storeRuntime(request, response);
    }
  } catch {
    // Background refresh failed - stale cache remains usable
  }
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
  return fetch(request);
}`;
}
