/**
 * Swoff Mutation Queue
 * Queue offline writes and sync when connection returns.
 *
 * Usage:
 *   import { queueMutation, processMutationQueue, flushMutations, getPendingCount } from './swoff/mutation-queue.ts';
 *
 *   // Queue a mutation
 *   await queueMutation({
 *     method: "POST",
 *     url: "/api/todos",
 *     body: { title: "Grocery" },
 *     tags: ["todos"],
 *   });
 *
 *   // Flush queued mutations (e.g., after login)
 *   await flushMutations();
 *
 *   // Auto-processes on online event
 */

import { getAuth } from "./auth/store.ts";
import { invalidateByTags } from "./cache.ts";
import type { MutationQueueItem } from "./swoff.d.ts";
const DB_NAME = "swoff-queue";
const STORE_NAME = "mutations";
const MAX_RETRIES = 5;

function openQueueDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by-timestamp", "timestamp");
      }
    };
    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

let isSyncing = false;

/** Store a write operation in IndexedDB for later sync. Works offline — use it for POST/PUT/PATCH/DELETE when the user might be offline. */
export async function queueMutation(mutation: Partial<MutationQueueItem>): Promise<void> {
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  let body = mutation.body;
  let bodyType = "json";
  if (body instanceof FormData) {
    bodyType = "formdata";
    body = [...body.entries()];
  } else if (body instanceof Blob) {
    bodyType = "blob";
  } else if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    bodyType = "buffer";
  }

  store.add({
    id: crypto.randomUUID(),
    method: mutation.method,
    url: mutation.url,
    body,
    bodyType,
    headers: mutation.headers || {},
    timestamp: Date.now(),
    retryCount: 0,
    tags: mutation.tags || [],
  });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
}

/** Process all queued mutations in order. Sends them to the server. Runs automatically on the online event. */
export async function processMutationQueue(): Promise<void> {
  if (!navigator.onLine || isSyncing) return;
  isSyncing = true;

  try {
  const auth = await getAuth();
  const authHeader: Record<string, string> = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
    const db = await openQueueDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("by-timestamp");
    const queue: MutationQueueItem[] = await new Promise<MutationQueueItem[]>((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    let succeeded = 0;
    let failed = 0;

    for (const item of queue) {
      if (item.retryCount >= MAX_RETRIES) {
        await removeFromQueue(item.id);
        failed++;
        continue;
      }

      try {
        let replayBody;
        let contentType;
        const bt = item.bodyType || "json";
        if (bt === "formdata") {
          replayBody = new FormData();
          for (const [key, value] of item.body || []) {
            replayBody.append(key, value);
          }
        } else if (bt === "blob") {
          replayBody = item.body;
        } else if (bt === "buffer") {
          replayBody = item.body instanceof ArrayBuffer ? new Uint8Array(item.body) : item.body;
        } else {
          replayBody = JSON.stringify(item.body);
          contentType = "application/json";
        }
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            ...(contentType ? { "Content-Type": contentType } : {}),
            ...authHeader,            ...item.headers,
          },
          body: replayBody,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        if (item.tags && item.tags.length > 0) {
          await invalidateByTags(item.tags);
        }

        await removeFromQueue(item.id);
        succeeded++;
      } catch {
        item.retryCount++;
        await updateInQueue(item);
        failed++;
      }
    }

    window.dispatchEvent(
      new CustomEvent("mutation-sync-complete", {
        detail: { succeeded, failed },
      })
    );
  } finally {
    isSyncing = false;
    window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
  }
}

/** Immediately process all queued mutations. Call this after re-login to flush mutations that failed due to auth expiry. */
export async function flushMutations(): Promise<void> {
  await processMutationQueue();
}

async function removeFromQueue(id: string): Promise<void> {
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateInQueue(item: MutationQueueItem): Promise<void> {
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(item);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get the number of queued mutations waiting to be synced. Useful for showing a sync badge. */
export async function getPendingCount(): Promise<number> {
  const db = await openQueueDB();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve((request as IDBRequest<number>).result);
    request.onerror = () => reject((request as IDBRequest).error);
  });
}
