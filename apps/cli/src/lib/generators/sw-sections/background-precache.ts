export function generateBackgroundPrecache(): string {
  return `
// --- Background Precaching ---

const PRECACHE_DB_NAME = "swoff-precache";
const PRECACHE_DB_VERSION = 1;

async function getPrecacheCheckpoint() {
  try {
    const db = await openDB(PRECACHE_DB_NAME, PRECACHE_DB_VERSION, function(db) {
      if (!db.objectStoreNames.contains("progress"))
        db.createObjectStore("progress", { keyPath: "key" });
    });
    const tx = db.transaction("progress", "readonly");
    const store = tx.objectStore("progress");
    const entry = await new Promise(function(resolve, reject) {
      const req = store.get("checkpoint");
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
    db.close();
    return entry ? entry.value : 0;
  } catch(e) {
    return 0;
  }
}

async function setPrecacheCheckpoint(index) {
  try {
    const db = await openDB(PRECACHE_DB_NAME, PRECACHE_DB_VERSION);
    const tx = db.transaction("progress", "readwrite");
    const store = tx.objectStore("progress");
    store.put({ key: "checkpoint", value: index });
    await new Promise(function(resolve, reject) {
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function() { reject(tx.error); };
    });
    db.close();
  } catch(e) {}
}

async function resetPrecacheCheckpoint() {
  try {
    const db = await openDB(PRECACHE_DB_NAME, PRECACHE_DB_VERSION);
    const tx = db.transaction("progress", "readwrite");
    const store = tx.objectStore("progress");
    store.put({ key: "checkpoint", value: 0 });
    await new Promise(function(resolve, reject) {
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function() { reject(tx.error); };
    });
    db.close();
  } catch(e) {}
}

async function startBackgroundPrecache() {
  var cache = await caches.open("precache");
  var total = ASSETS_TO_CACHE.length;
  if (total === 0) return;

  var checkpoint = await getPrecacheCheckpoint();
  if (checkpoint >= total) return;

  var downloaded = 0;
  var attempted = 0;
  var allClients = await self.clients.matchAll({ includeUncontrolled: true });
  var i;

  for (i = 0; i < checkpoint && i < total; i++) {
    var m = await cache.match(ASSETS_TO_CACHE[i]);
    if (m) downloaded++;
  }
  attempted = checkpoint;

  for (i = checkpoint; i < total; i += PRECACHE_CONCURRENCY) {
    var batchEnd = Math.min(i + PRECACHE_CONCURRENCY, total);
    var promises = [];
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
            console.error("Failed to precache " + url + ":", err);
            allClients.forEach(function(client) {
              client.postMessage({
                type: "SW_NOTIFICATION",
                level: "warn",
                code: "PRECACHE_FAILED",
                message: "Failed to precache " + url,
              });
            });
          }
        })();
      })(ASSETS_TO_CACHE[j]));
      if (PRECACHE_DELAY_MS > 0) {
        await new Promise(function(resolve) { setTimeout(resolve, PRECACHE_DELAY_MS); });
      }
    }

    await Promise.all(promises);
    await setPrecacheCheckpoint(batchEnd);

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
}
`;
}
