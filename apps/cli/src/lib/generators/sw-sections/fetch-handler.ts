/**
 * Generates the SW fetch event handler with all caching strategies.
 */

export function generateFetchHandler(
  swConfig: { defaultStrategy: string; strategies: Record<string, string> },
  tagInvalidation: boolean,
): string {
  const { defaultStrategy, strategies } = swConfig;

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

  return `
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
  const cache = await caches.open(CACHE_NAME);
  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
  const url = new URL(request.url);

  const byPath = await cache.match(url.pathname);
  if (byPath) return byPath;

  const byRequest = await runtimeCache.match(request);
  if (byRequest) return byRequest;

  if (request.mode === "navigate") {
    const spa = await cache.match("/index.html");
    if (spa) return spa;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      event.waitUntil(
        (async () => {
          await runtimeCache.put(request, cloned);${tagInvalidationCode}
        })(),
      );
    }
    return response;
  } catch {
    return new Response("Offline: content not available", { status: 503 });
  }
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
        })(),
      );
    }
    return response;
  } catch {
    const cached = await runtimeCache.match(request);
    if (cached) return cached;

    if (request.mode === "navigate") {
      const cache = await caches.open(CACHE_NAME);
      const spa = await cache.match("/index.html");
      if (spa) return spa;
    }

    return new Response("Offline: content not available", { status: 503 });
  }
}

async function staleWhileRevalidate(event, request) {
  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
  const cached = await runtimeCache.match(request);

  if (cached) {
    event.waitUntil(refreshCache(runtimeCache, request));
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      await runtimeCache.put(request, response.clone());${staleTagCode}
    }
    return response;
  } catch {
    return new Response("Offline: content not available", { status: 503 });
  }
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
  const cache = await caches.open(CACHE_NAME);
  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);

  const byPath = await cache.match(new URL(request.url).pathname);
  if (byPath) return byPath;

  const byRequest = await runtimeCache.match(request);
  if (byRequest) return byRequest;

  return new Response("Not in cache", { status: 404 });
}

async function networkOnly(event, request) {
  try {
    return await fetch(request);
  } catch {
    return new Response("Network error", { status: 503 });
  }
}`;
}
