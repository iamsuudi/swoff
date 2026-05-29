/**
 * Generates IndexedDB-based tag invalidation logic for the SW.
 * After invalidation, tries to re-fetch URLs in the background.
 * On failure, keeps the old entry as stale-while-revalidate fallback.
 * Supports cascading invalidation (tag A → tags B, C).
 */

function generateCascadingCode(cascading: Record<string, string[]>): string {
  if (!cascading || Object.keys(cascading).length === 0) return "null";
  return JSON.stringify(cascading);
}

export function generateTagManagement(cascading: Record<string, string[]> = {}): string {
  const cascadingCode = generateCascadingCode(cascading);

  return `
const staleVersions = new Map();
const STALE_VERSIONS_MAX = 100;
const STALE_VERSION_TTL = 30 * 60 * 1000;
const TAG_DB_NAME = "swoff-cache-tags";
const TAG_STORE_NAME = "tags";

// Cascading invalidation map (tag → dependent tags)
const CASCADING_MAP = ${cascadingCode};

function resolveCascadingTags(tag) {
  if (!CASCADING_MAP) return [tag];
  const deps = CASCADING_MAP[tag];
  if (!deps || deps.length === 0) return [tag];
  const result = new Set([tag]);
  for (const dep of deps) result.add(dep);
  return [...result];
}

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
  const allTags = resolveCascadingTags(tag);

  for (const currentTag of allTags) {
    const db = await openTagDB();
    const tx = db.transaction(TAG_STORE_NAME, "readonly");
    const store = tx.objectStore(TAG_STORE_NAME);
    const index = store.index("by-tag");
    const entries = await new Promise((resolve, reject) => {
      const request = index.getAll(currentTag);
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
  }

  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "TAG_INVALIDATED", tag, cascadingTags: allTags });
  });
}`;
}
