export function generateBackgroundPrecache(): string {
  return `
// --- Background Precaching ---

var PRECACHE_VERSION_KEY = "precache-version";
var PRECACHE_CHECKPOINT_KEY = "checkpoint";
var PRECACHE_CACHE_NAME = "precache-" + computeAssetsVersion();
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
    var cache = await caches.open(PRECACHE_CACHE_NAME);
    var keys = await cache.keys();
    await Promise.all(keys.map(function(req) { return cache.delete(req); }));
    await setPrecacheMeta(PRECACHE_VERSION_KEY, current);
    await setPrecacheMeta(PRECACHE_CHECKPOINT_KEY, 0);
  }
}

async function startBackgroundPrecache() {
  if (_precachingActive) return;
  _precachingActive = true;
  try {
  await ensurePrecacheVersion();
  var total = ASSETS_TO_CACHE.length;
  if (total === 0) return;

  var cache = await caches.open(PRECACHE_CACHE_NAME);
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
            var response = await fetch(url);
            if (!response.ok) {
              console.warn("Failed to precache " + url + ": " + response.status);
              downloaded++;
              return;
            }
            await cache.put(url, response);
            downloaded++;
          } catch(err) {
            console.warn("Network error precaching " + url + ":", err);
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
`;
}
