/**
 * Generates IndexedDB-based tag invalidation logic for the SW.
 * After invalidation, tries to re-fetch URLs in the background.
 * On failure, keeps the old entry as stale-while-revalidate fallback.
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

async function refetchAfterInvalidation(url, actualUrl) {
  const fetchUrl = actualUrl || url;
  try {
    const response = await fetch(fetchUrl);
    if (response.ok) {
      const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
      await runtimeCache.put(url, response);
      staleVersions.delete(url);
      return true;
    }
  } catch {
    // fetch failed (network error, auth required, etc.)
  }
  staleVersions.set(url, Date.now());
  return false;
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

  // Remove from tag index
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

  // Background refetch each deleted URL; keep stale on failure
  for (const entry of entries) {
    refetchAfterInvalidation(entry.url, entry.actualUrl);
  }

  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "TAG_INVALIDATED", tag });
  });
}`;
}
