/**
 * Generates the SW fetch event handler with all caching strategies.
 */

export function generateFetchHandler(
  swConfig: { defaultStrategy: string; strategies: Record<string, string>; maxCacheEntries?: number; maxCacheAge?: number; navigationMode?: string; spaEntry?: string },
  tagInvalidation: boolean,
): string {
  const { defaultStrategy, strategies, maxCacheEntries, maxCacheAge, navigationMode, spaEntry } = swConfig;

  const hasTrim = (maxCacheEntries ?? 0) > 0 || (maxCacheAge ?? 0) > 0;
  const navMode = navigationMode ?? "spa";
  const spaPath = spaEntry ?? "/index.html";
  const navCode = navMode === "spa" ? `
  if (request.mode === "navigate") {
    const precache = await caches.open(CACHE_NAME);
    const entry = await precache.match("${spaPath}");
    if (entry) return entry;
  }` : "";

  const tagInvalidationCode = tagInvalidation ? `
          const tagsHeader = event.request.headers.get("X-SW-Cache-Tags");
          if (tagsHeader) {
            const url = new URL(event.request.url).href;
            const tags = tagsHeader.split(",").map((t) => t.trim());
            await cacheTagUrl(url, tags);
          }` : "";

  const staleTagCode = tagInvalidation ? `
      const tagsHeader = request.headers.get("X-SW-Cache-Tags");
      if (tagsHeader) {
        const url = new URL(request.url).href;
        const tags = tagsHeader.split(",").map((t) => t.trim());
        await cacheTagUrl(url, tags);
      }` : "";

  const trimCode = hasTrim ? `        await trimRuntimeCache(CACHE_NAME_RUNTIME);\n` : "";

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
function isReadRequest(request) {
  const strategy = request.headers.get("X-SW-Cache-Strategy");
  if (strategy === "read") return true;
  if (strategy === "mutation") return false;
  return request.method === "GET" || request.method === "HEAD";
}

function determineCacheStrategy(request, customStrategies, defaultStrategy) {
  const url = request.url;
  for (const [pattern, strategy] of Object.entries(customStrategies)) {
    if (url.includes(pattern.replace("*", ""))) return strategy;
  }
  return defaultStrategy;
}

self.addEventListener("fetch", (event) => {
  if (!isReadRequest(event.request)) return;

  const strategy = determineCacheStrategy(event.request, ${JSON.stringify(strategies)}, "${defaultStrategy}");

  if (strategy === "stale-while-revalidate" || event.request.headers.get("X-SW-Stale") === "true") {
    event.respondWith(staleWhileRevalidate(event, event.request));
    return;
  }

  if (strategy === "network-first") {
    event.respondWith(networkFirst(event, event.request));
    return;
  }

  if (strategy === "cache-only") {
    event.respondWith(cacheOnly(event, event.request));
    return;
  }

  if (strategy === "network-only") {
    event.respondWith(networkOnly(event, event.request));
    return;
  }

  // cache-first (default)
  event.respondWith(cacheFirst(event, event.request));
});

async function cacheFirst(event, request) {
  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);

  const cached = await runtimeCache.match(request);
  if (cached) return cached;
${navCode}
  const response = await fetch(request);
  if (response.ok) {
    const cloned = response.clone();
    event.waitUntil(
      (async () => {
        await runtimeCache.put(request, cloned);${tagInvalidationCode}
${trimCode}      })(),
    );
  }
  return response;
}

async function networkFirst(event, request) {
  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      event.waitUntil(
        (async () => {
          await runtimeCache.put(request, cloned);${tagInvalidationCode}
${trimCode}        })(),
      );
    }
    return response;
  } catch {
    const cached = await runtimeCache.match(request);
    if (cached) return cached;
${navCode}
    throw new Error("Request failed and no cached response available");
  }
}

async function staleWhileRevalidate(event, request) {
  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
  const cached = await runtimeCache.match(request);

  if (cached) {
    event.waitUntil(refreshCache(runtimeCache, request));
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    await runtimeCache.put(request, response.clone());${staleTagCode}
${hasTrim ? "      await trimRuntimeCache(CACHE_NAME_RUNTIME);\n" : ""}  }
  return response;
}

async function refreshCache(cache, request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
  } catch {
    // Background refresh failed - stale cache remains usable
  }
}

async function cacheOnly(event, request) {
  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);

  const byRequest = await runtimeCache.match(request);
  if (byRequest) return byRequest;

  return new Response("Not in cache", { status: 404 });
}

async function networkOnly(event, request) {
  return fetch(request);
}`;
}
