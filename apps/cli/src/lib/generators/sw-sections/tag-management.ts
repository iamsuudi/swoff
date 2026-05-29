/**
 * Generates IndexedDB-based tag invalidation logic for the SW.
 * After invalidation, tries to re-fetch URLs in the background.
 * On failure, keeps the old entry as stale-while-revalidate fallback.
 *
 * Cascading is handled by the client — the SW processes one tag at a time.
 */

export function generateTagManagement(): string {
  return `
const staleVersions = new Map();
const STALE_VERSIONS_MAX = 100;
const STALE_VERSION_TTL = 30 * 60 * 1000;
const TAG_DB_NAME = "swoff-cache-tags";
const TAG_STORE_NAME = "tags";

function cleanStaleVersions() {
  const now = Date.now();
  for (const [url, ts] of staleVersions) {
    if (staleVersions.size > STALE_VERSIONS_MAX || now - ts > STALE_VERSION_TTL) {
      staleVersions.delete(url);
    }
  }
}

function openTagDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(TAG_DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(TAG_STORE_NAME)) {
        const store = db.createObjectStore(TAG_STORE_NAME, { keyPath: "url" });
        store.createIndex("by-tag", "tags", { multiEntry: true });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function cacheTagUrl(url, actualUrl, tags) {
  const db = await openTagDB();
  const tx = db.transaction(TAG_STORE_NAME, "readwrite");
  const store = tx.objectStore(TAG_STORE_NAME);
  store.put({ url, actualUrl, tags });
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function invalidateByTag(tag) {
  const db = await openTagDB();
  const tx = db.transaction(TAG_STORE_NAME, "readonly");
  const store = tx.objectStore(TAG_STORE_NAME);
  const index = store.index("by-tag");
  const entries = await new Promise((resolve, reject) => {
    const request = index.getAll(tag);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await db.close();

  // Remove from tag index and runtime cache
  const writeDb = await openTagDB();
  const writeTx = writeDb.transaction(TAG_STORE_NAME, "readwrite");
  const writeStore = writeTx.objectStore(TAG_STORE_NAME);
  for (const entry of entries) {
    writeStore.delete(entry.url);
  }
  await new Promise((resolve, reject) => {
    writeTx.oncomplete = () => resolve();
    writeTx.onerror = () => reject(writeTx.error);
  });
  writeDb.close();

  const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
  for (const entry of entries) {
    await runtimeCache.delete(entry.url);
  }

  // Enqueue background refetch through batched refresh queue
  for (const entry of entries) {
    staleVersions.set(entry.url, Date.now());
    queueRefresh(entry.url, entry.actualUrl);
  }

  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "TAG_INVALIDATED", tag });
  });
}

async function getUrlsForTag(tag) {
  const db = await openTagDB();
  const tx = db.transaction(TAG_STORE_NAME, "readonly");
  const store = tx.objectStore(TAG_STORE_NAME);
  const index = store.index("by-tag");
  const entries = await new Promise((resolve, reject) => {
    const request = index.getAll(tag);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await db.close();
  return entries.map((e) => ({ url: e.url, actualUrl: e.actualUrl }));
}

async function getTagsForUrl(url) {
  const db = await openTagDB();
  const tx = db.transaction(TAG_STORE_NAME, "readonly");
  const store = tx.objectStore(TAG_STORE_NAME);
  const entry = await new Promise((resolve, reject) => {
    const request = store.get(url);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await db.close();
  return entry ? entry.tags : [];
}

async function invalidateMatching(globPattern) {
  const db = await openTagDB();
  const tx = db.transaction(TAG_STORE_NAME, "readonly");
  const store = tx.objectStore(TAG_STORE_NAME);
  const allEntries = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await db.close();

  const matching = allEntries.filter((entry) => matchGlob(entry.url, globPattern));
  const tags = new Set();
  for (const entry of matching) {
    for (const tag of entry.tags) {
      tags.add(tag);
    }
  }
  await Promise.all([...tags].map((tag) => invalidateByTag(tag)));
}`;
}
