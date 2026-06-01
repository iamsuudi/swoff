/**
 * Swoff Mutation Queue
 * Queue offline writes and sync when connection returns.
 * Supports configurable batch size, rate limiting, and exponential backoff.
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
 *
 * Config:
 *   batchSize: 5      — mutations per progress event
 *   batchDelayMs: 1000 — delay between mutations (rate limiting)
 *   maxRetries: 3      — max retries before dropping
 *   retryBackoffMs: 2000 — exponential backoff base
 */

import { getAuth } from "./auth/store.ts";
import { invalidateByTags } from "./cache.ts";
import type { MutationQueueItem } from "./swoff.d.ts";
const DB_NAME = "swoff-queue";
const STORE_NAME = "mutations";
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

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
export async function queueMutation(
  mutation: Partial<MutationQueueItem>,
): Promise<void> {
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
    nextRetryAt: 0,
    tags: mutation.tags || [],
  });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
}

/** Replay a single queued mutation. Returns true on success, false on failure. */
async function replayMutation(item: MutationQueueItem): Promise<boolean> {
  try {
    const auth = await getAuth();
    const authHeader: Record<string, string> = auth?.token
      ? { Authorization: `Bearer ${auth.token}` }
      : {};
    let replayBody: BodyInit | null = null;
    let contentType: string | undefined;
    const bt = item.bodyType || "json";
    if (bt === "formdata") {
      replayBody = new FormData();
      for (const [key, value] of (item.body || []) as [
        string,
        FormDataEntryValue,
      ][]) {
        replayBody.append(key, value);
      }
    } else if (bt === "blob") {
      replayBody = item.body as BodyInit | null;
    } else if (bt === "buffer") {
      replayBody =
        item.body instanceof ArrayBuffer
          ? (new Uint8Array(item.body) as BodyInit)
          : (item.body as BodyInit);
    } else if (item.body != null) {
      replayBody = JSON.stringify(item.body);
      contentType = "application/json";
    }
    const response = await fetch(item.url, {
      method: item.method,
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...authHeader,
        ...item.headers,
      },
      ...(replayBody != null ? { body: replayBody } : {}),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    if (item.tags && item.tags.length > 0) {
      await invalidateByTags(item.tags);
    }

    await removeFromQueue(item.id);
    return true;
  } catch {
    item.retryCount++;
    item.nextRetryAt =
      Date.now() + RETRY_BACKOFF_MS * Math.pow(2, item.retryCount - 1);
    await updateInQueue(item);
    return false;
  }
}

/** Process all queued mutations in order. Sends them to the server. Runs automatically on the online event. Respects batchSize for progress reporting and batchDelayMs for rate limiting. */
export async function processMutationQueue(): Promise<void> {
  if (!navigator.onLine || isSyncing) return;
  isSyncing = true;

  try {
    const db = await openQueueDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("by-timestamp");
    const queue: MutationQueueItem[] = await new Promise<MutationQueueItem[]>(
      (resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      },
    );

    let succeeded = 0;
    let failed = 0;
    const total = queue.length;

    for (const item of queue) {
      if (item.retryCount >= MAX_RETRIES) {
        await removeFromQueue(item.id);
        failed++;
        continue;
      }

      // Skip items whose backoff delay hasn't elapsed yet
      if (item.nextRetryAt && Date.now() < item.nextRetryAt) {
        continue;
      }

      const ok = await replayMutation(item);
      if (ok) {
        succeeded++;
      } else {
        failed++;
      }

      // Rate limiting delay between mutations
      if (BATCH_DELAY_MS > 0 && succeeded + (failed - succeeded) < total) {
        await sleep(BATCH_DELAY_MS);
      }

      // Emit progress after every BATCH_SIZE mutations
      if (
        (succeeded + failed) % BATCH_SIZE === 0 ||
        succeeded + failed === total
      ) {
        window.dispatchEvent(
          new CustomEvent("mutation-sync-complete", {
            detail: { succeeded, failed, total, current: succeeded + failed },
          }),
        );
      }
    }

    window.dispatchEvent(
      new CustomEvent("mutation-sync-complete", {
        detail: { succeeded, failed, total },
      }),
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
