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

  const evictionHelper = `
const MAX_RUNTIME_CACHE_AGE = ${maxRuntimeCacheAge && maxRuntimeCacheAge > 0 ? maxRuntimeCacheAge : Infinity};

${maxRuntimeCacheAge && maxRuntimeCacheAge > 0 ? `
async function evictStaleRuntimeCache() {
  var cutoff = Date.now() - MAX_RUNTIME_CACHE_AGE * 1000;
  for (const name of [CACHE_NAME_RUNTIME, CACHE_NAME_RUNTIME_HTML]) {
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
` : ""}`;

  return `${evictionHelper}
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (typeof clearAllReactive === "function") clearAllReactive();
      await self.clients.claim();${navPreloadCode}${evictionCode}
      const keys = await caches.keys();
      await Promise.all(
        ${cacheCleanup}.map((key) => caches.delete(key))
      );
    })()
  );
});`;
}
