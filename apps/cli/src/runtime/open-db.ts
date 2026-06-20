import type { RuntimeContext } from "./utils.js";
import { T, R, PT, AS, O } from "./utils.js";

export function generateOpenDBCode(ctx: RuntimeContext): string {
  const { ts } = ctx;
  return `/**
 * Swoff IndexedDB Helper
 * Generic promise-based IndexedDB open helper used by auth, queue, and push modules.
 *
 * Usage:
 *   import { openDB } from "./db.${ctx.ext}";
 *
 *   const db = await openDB("my-db", "my-store", "id");
 *   // optional upgrade callback for additional indexes:
 *   const db = await openDB("my-db", "my-store", "id", (db) => {
 *     db.createIndex("by-timestamp", "timestamp");
 *   });
 */

export function openDB(
  name${T(ts, "string")},
  storeName${T(ts, "string")},
  keyPath${T(ts, "string | string[]")},
  upgradeCallback${O(ts, "(db: IDBDatabase) => void")},
  version${O(ts, "number")}
)${R(ts, "Promise<IDBDatabase>")}{
  return new Promise${PT(ts, "IDBDatabase")}((resolve, reject) => {
    const request = indexedDB.open(name, version ?? 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target${AS(ts, "IDBOpenDBRequest")}).result;
      if (upgradeCallback) {
        upgradeCallback(db);
      } else if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: keyPath${AS(ts, 'IDBObjectStoreParameters["keyPath"]')} });
      }
    };
    request.onsuccess = (e) => resolve((e.target${AS(ts, "IDBOpenDBRequest")}).result);
    request.onerror = (e) => reject((e.target${AS(ts, "IDBRequest")}).error);
  });
}
`;
}
