/**
 * Swoff Mutation Queue
 * Queue offline writes and sync when connection returns.
 * Supports configurable batch size, rate limiting, and exponential backoff.
 *
 * Usage:
 *   import { queueMutation, processMutationQueue, flushMutations, getPendingCount } from './swoff/offline/queue.ts';
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
 *   batchSize: 1      — mutations per progress event
 *   batchDelayMs: 0 — delay between mutations (rate limiting)
 *   maxRetries: 5      — max retries before dropping
 *   retryBackoffMs: 1000 — exponential backoff base
 */

import { getAuth, ensureValidAuth, clearAuth } from "../auth/store.ts";
import { invalidateByTags } from "../cache/index.ts";
import type { MutationQueueItem } from "../swoff.d.ts";
const DB_NAME = "swoff-queue";
const STORE_NAME = "mutations";
const BATCH_SIZE = 1;
const BATCH_DELAY_MS = 0;
const MAX_RETRIES = 5;
const RETRY_BACKOFF_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

import { openDB } from "../db.ts";

function openQueueDB(): Promise<IDBDatabase> {
  return openDB(DB_NAME, STORE_NAME, "id", (db) => {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("by-timestamp", "timestamp");
    }
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
  if (typeof body === "string") {
    bodyType = "text";
  } else if (body instanceof FormData) {
    bodyType = "formdata";
    body = [...body.entries()];
  } else if (body instanceof Blob) {
    bodyType = "blob";
  } else if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    bodyType = "buffer";
  }

  // Strip auth headers before storing — tokens must never persist in IDB
  const safeHeaders: Record<string, string> = { ...(mutation.headers || {}) };
  delete safeHeaders["authorization"];
  delete safeHeaders["Authorization"];

  store.add({
    id: crypto.randomUUID(),
    method: mutation.method,
    url: mutation.url,
    body,
    bodyType,
    headers: safeHeaders,
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

/** Replay a single queued mutation. Uses the provided db connection if available. Returns true on success, false on failure. */
async function replayMutation(item: MutationQueueItem, db: IDBDatabase | undefined): Promise<boolean> {
  try {
  const auth = await getAuth();
  const authHeader: Record<string, string> = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
    let replayBody: BodyInit | null = null;
    let contentType: string | undefined;
    const bt = item.bodyType || "json";
    if (bt === "formdata") {
      replayBody = new FormData();
      for (const [key, value] of (item.body || []) as [string, FormDataEntryValue][]) {
        replayBody.append(key, value);
      }
    } else if (bt === "blob") {
      replayBody = item.body as BodyInit | null;
    } else if (bt === "buffer") {
      replayBody = item.body instanceof ArrayBuffer ? new Uint8Array(item.body) as BodyInit : item.body as BodyInit;
    } else if (bt === "text") {
      replayBody = item.body as BodyInit | null;
    } else if (item.body != null) {
      replayBody = JSON.stringify(item.body);
      contentType = "application/json";
    }
    const response = await fetch(item.url, {
      method: item.method,
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...item.headers,
            ...authHeader,
      },
      ...(replayBody != null ? { body: replayBody } : {}),
    });

    if (response.status === 401) {
      // Auth failure — try silent refresh (/refresh endpoint)
      const refreshed = await ensureValidAuth();
      if (refreshed?.token) {
        // Refresh succeeded — retry the mutation once
        const retryHeader: Record<string, string> = refreshed?.token ? { Authorization: `Bearer ${refreshed.token}` } : {};
        const retryResponse = await fetch(item.url, {
          method: item.method,
          headers: {
            ...(contentType ? { "Content-Type": contentType } : {}),
            ...item.headers,
            ...retryHeader,
          },
          ...(replayBody != null ? { body: replayBody } : {}),
        });
        if (retryResponse.ok) {
          // Success after auth refresh — normal flow
          if (item.tags && item.tags.length > 0) {
            await invalidateByTags(item.tags);
          }
          await removeFromQueue(item.id, db);
          return true;
        }
        // Retry still failed — authenticated but not authorized for this resource
        // Drop this mutation immediately (don't retry)
        await removeFromQueue(item.id, db);
        return true;
      }
      // Refresh failed — session expired. ClearAuth cascades to clear queue + caches.
      await clearAuth();
      return false;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    if (item.tags && item.tags.length > 0) {
      await invalidateByTags(item.tags);
    }

    await removeFromQueue(item.id, db);
    return true;
  } catch {
    item.retryCount++;
    item.nextRetryAt = Date.now() + RETRY_BACKOFF_MS * Math.pow(2, item.retryCount - 1);
    await updateInQueue(item, db);
    return false;
  }
}

/** Clear all queued mutations. Called when auth context changes (logout, session expiry) — queued operations belong to the old session and must not leak. */
export async function clearQueue(): Promise<void> {
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
}

/** Process all queued mutations in order. Sends them to the server. Runs automatically when mutations are queued or on reconnection. Respects batchSize for progress reporting and batchDelayMs for rate limiting. */
export async function processMutationQueue(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  const db = await openQueueDB();
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("by-timestamp");
    const queue: MutationQueueItem[] = await new Promise<MutationQueueItem[]>((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (queue.length === 0) return;

    let succeeded = 0;
    let failed = 0;
    const total = queue.length;
    let earliestRetry = Infinity;

    for (const item of queue) {
      if (item.retryCount >= MAX_RETRIES) {
        await removeFromQueue(item.id, db);
        failed++;
        continue;
      }

      // Skip items whose backoff delay hasn't elapsed yet
      if (item.nextRetryAt && Date.now() < item.nextRetryAt) {
        if (item.nextRetryAt < earliestRetry) earliestRetry = item.nextRetryAt;
        continue;
      }

      const ok = await replayMutation(item, db);
      if (ok) {
        succeeded++;
      } else {
        failed++;
      }

      // Rate limiting delay between mutations
      if (BATCH_DELAY_MS > 0 && succeeded + failed < total) {
        await sleep(BATCH_DELAY_MS);
      }

      // Emit progress after every BATCH_SIZE mutations
      if ((succeeded + failed) % BATCH_SIZE === 0 || succeeded + failed === total) {
        window.dispatchEvent(
          new CustomEvent("mutation-sync-progress", {
            detail: { succeeded, failed, total },
          })
        );
      }
    }

    window.dispatchEvent(
      new CustomEvent("mutation-sync-complete", {
        detail: { succeeded, failed, total },
      })
    );

    // Schedule retry when the earliest backoff timer expires
    if (earliestRetry < Infinity && earliestRetry > Date.now()) {
      setTimeout(() => {
        if (!isSyncing) processMutationQueue();
      }, earliestRetry - Date.now());
    }
  } finally {
    db.close();
    isSyncing = false;
    window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
  }
}

/** Immediately process all queued mutations. Call this after re-login to flush mutations that failed due to auth expiry. */
export async function flushMutations(): Promise<void> {
  await processMutationQueue();
}

async function removeFromQueue(id: string, db: IDBDatabase | undefined): Promise<void> {
  if (!db) db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateInQueue(item: MutationQueueItem, db: IDBDatabase | undefined): Promise<void> {
  if (!db) db = await openQueueDB();
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

/** Get the position of a mutation in the queue (0-based). Returns -1 if not found. */
export async function getQueuePosition(id: string): Promise<number> {
  const items = await getQueueItems();
  return items.findIndex((item) => item.id === id);
}

/** Get all pending queue items with their details. */
export async function getQueueItems(): Promise<MutationQueueItem[]> {
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("by-timestamp");
  return new Promise<MutationQueueItem[]>((resolve, reject) => {
    const request = index.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
