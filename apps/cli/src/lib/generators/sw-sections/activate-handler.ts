export function generateActivateHandler(clearRuntimeOnUpdate: boolean, navigationPreload?: boolean, maxRuntimeCacheAge?: number): string {
  const cacheCleanup = clearRuntimeOnUpdate
    ? `keys.filter((key) => key !== CACHE_NAME)`
    : `keys.filter((key) => key !== CACHE_NAME && key !== CACHE_NAME_RUNTIME && key !== CACHE_NAME_RUNTIME_HTML)`;

  const navPreloadCode = navigationPreload ? `
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }` : "";

  const evictionCode = maxRuntimeCacheAge && maxRuntimeCacheAge > 0 ? `
      await evictStaleRuntimeCache();` : "";

  const evictionHelper = maxRuntimeCacheAge && maxRuntimeCacheAge > 0 ? `
const MAX_RUNTIME_CACHE_AGE = ${maxRuntimeCacheAge};

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
` : "";

  return `${evictionHelper}
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();${navPreloadCode}${evictionCode}
      const keys = await caches.keys();
      await Promise.all(
        ${cacheCleanup}.map((key) => caches.delete(key))
      );
    })()
  );
});`;
}
