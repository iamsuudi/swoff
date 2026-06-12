/**
 * Swoff IndexedDB Helper
 * Generic promise-based IndexedDB open helper used by auth, queue, and push modules.
 *
 * Usage:
 *   import { openDB } from "./db.ts";
 *
 *   const db = await openDB("my-db", "my-store", "id");
 *   // optional upgrade callback for additional indexes:
 *   const db = await openDB("my-db", "my-store", "id", (db) => {
 *     db.createIndex("by-timestamp", "timestamp");
 *   });
 */

export function openDB<T>(
  name: string,
  storeName: string,
  keyPath: string | string[],
  upgradeCallback?: (db: IDBDatabase) => void
): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (upgradeCallback) {
        upgradeCallback(db);
      } else if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: keyPath as IDBObjectStoreParameters["keyPath"] });
      }
    };
    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}
