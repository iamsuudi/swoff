export function generateActivateHandler(navigationPreload?: boolean, maxRuntimeCacheAge?: number): string {
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
` : ""}`;

  return `${evictionHelper}
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
      ["swoff-runtime", "swoff-runtime-html", "precache"].map(function(n) { return caches.delete(n); })
    );
    await resetPrecacheCheckpoint();
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
      await self.clients.claim();${navPreloadCode}${evictionCode}
    })()
  );
  startBackgroundPrecache();
});`;
}
