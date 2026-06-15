export function generateTagManagement(maxAge?: number): string {
  const evict = maxAge && maxAge > 0;

  return `
const TAG_DB_NAME = "swoff-cache-tags";
const TAG_STORE_NAME = "tags";
// Bump this when adding new indexes/stores for schema migration
const TAG_DB_VERSION = 1;

async function cacheTagUrl(url, actualUrl, tags, method, body, contentType) {
  const db = await openDB(TAG_DB_NAME, TAG_DB_VERSION, function(db) {
    if (!db.objectStoreNames.contains(TAG_STORE_NAME)) {
      const store = db.createObjectStore(TAG_STORE_NAME, { keyPath: "url" });
      store.createIndex("by-tag", "tags", { multiEntry: true });
    }
  });
  ${
    evict
      ? `await pruneStaleStore(db, TAG_STORE_NAME, Date.now() - MAX_RUNTIME_CACHE_AGE * 1000);
  `
      : ""
  }const tx = db.transaction(TAG_STORE_NAME, "readwrite");
  const store = tx.objectStore(TAG_STORE_NAME);
  store.put({ url, actualUrl, tags, method: method || "GET", body: body || null, contentType: contentType || null, timestamp: Date.now() });
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getUrlsForTag(tag) {
  const db = await openDB(TAG_DB_NAME, TAG_DB_VERSION);
  const tx = db.transaction(TAG_STORE_NAME, "readonly");
  const store = tx.objectStore(TAG_STORE_NAME);
  const index = store.index("by-tag");
  const entries = await new Promise((resolve, reject) => {
    const request = index.getAll(tag);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  tx.oncomplete = () => db.close();
  return entries.map((e) => ({ url: e.url, actualUrl: e.actualUrl }));
}

async function getTagsForUrl(url) {
  const db = await openDB(TAG_DB_NAME, TAG_DB_VERSION);
  const tx = db.transaction(TAG_STORE_NAME, "readonly");
  const store = tx.objectStore(TAG_STORE_NAME);
  const entry = await new Promise((resolve, reject) => {
    const request = store.get(url);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  tx.oncomplete = () => db.close();
  return entry ? entry.tags : [];
}

async function invalidateByTag(tag) {
  const db = await openDB(TAG_DB_NAME, TAG_DB_VERSION);
  const tx = db.transaction(TAG_STORE_NAME, "readwrite");
  const store = tx.objectStore(TAG_STORE_NAME);
  const index = store.index("by-tag");
  const entries = await new Promise((resolve, reject) => {
    const request = index.getAll(tag);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (!entries || entries.length === 0) {
    tx.oncomplete = () => db.close();
    return;
  }

  for (const entry of entries) {
    store.delete(entry.url);
  }
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
  const rscCache = await caches.open(CACHE_NAME_RUNTIME_HTML);
  for (const entry of entries) {
    await runtimeCache.delete(entry.url);
    await rscCache.delete(entry.url);
    queueRefresh(entry.actualUrl);
  }

  broadcastToClients("TAG_INVALIDATED", { tag });
}

async function invalidateMatching(globPattern) {
  const db = await openDB(TAG_DB_NAME, TAG_DB_VERSION);
  const tx = db.transaction(TAG_STORE_NAME, "readonly");
  const store = tx.objectStore(TAG_STORE_NAME);
  const allEntries = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  tx.oncomplete = () => db.close();

  const matching = allEntries.filter((entry) => matchGlob(entry.actualUrl, globPattern));
  const tags = new Set();
  for (const entry of matching) {
    for (const tag of entry.tags) {
      tags.add(tag);
    }
  }
  await Promise.all([...tags].map((tag) => invalidateByTag(tag)));
}`;
}
