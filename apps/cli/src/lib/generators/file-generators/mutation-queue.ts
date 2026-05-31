import { GeneratorContext, writeFile } from "./context.js";

export function generateMutationQueue(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");
  const PT = (type: string) => (ts ? `<${type}>` : "");
  const AS = (type: string) => (ts ? ` as ${type}` : "");
  const authEnabled = ctx.config.features.auth.enabled;
  const tagInvalidation = ctx.config.features.tagInvalidation.enabled;
  const mqConfig = ctx.config.features.mutationQueue;
  const batchSize = mqConfig.batchSize;
  const batchDelayMs = mqConfig.batchDelayMs;
  const maxRetries = mqConfig.maxRetries;
  const retryBackoffMs = mqConfig.retryBackoffMs;

  const importLines = authEnabled
    ? `import { getAuth } from "./auth/store.${ext}";
`
    : "";

  const invalidateImport = tagInvalidation
    ? `import { invalidateByTags } from "./cache.${ext}";
`
    : "";
  const additionalImports = `${invalidateImport}${
  ts
    ? `import type { MutationQueueItem } from "./swoff.d.ts";
`
    : ""
}`;

  const authReplayHeaders = authEnabled
    ? `  const auth = await getAuth();
  const authHeader${T("Record<string, string>")} = auth?.token ? { Authorization: \`Bearer \${auth.token}\` } : {};
`
    : "";
  const authHeaderSpread = authEnabled
    ? `            ...authHeader,\n`
    : "            ";

  const code = `/**
 * Swoff Mutation Queue
 * Queue offline writes and sync when connection returns.
 * Supports configurable batch size, rate limiting, and exponential backoff.
 *
 * Usage:
 *   import { queueMutation, processMutationQueue, flushMutations, getPendingCount } from './swoff/mutation-queue.${ext}';
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
 *   batchSize: ${batchSize}      — mutations per progress event
 *   batchDelayMs: ${batchDelayMs} — delay between mutations (rate limiting)
 *   maxRetries: ${maxRetries}      — max retries before dropping
 *   retryBackoffMs: ${retryBackoffMs} — exponential backoff base
 */

${importLines}${additionalImports}const DB_NAME = "swoff-queue";
const STORE_NAME = "mutations";
const BATCH_SIZE = ${batchSize};
const BATCH_DELAY_MS = ${batchDelayMs};
const MAX_RETRIES = ${maxRetries};
const RETRY_BACKOFF_MS = ${retryBackoffMs};

function sleep(ms${T("number")})${R("Promise<void>")}{
  return new Promise((r) => setTimeout(r, ms));
}

function openQueueDB()${R("Promise<IDBDatabase>")}{
  return new Promise${PT("IDBDatabase")}((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target${AS("IDBOpenDBRequest")}).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by-timestamp", "timestamp");
      }
    };
    request.onsuccess = (e) => resolve((e.target${AS("IDBOpenDBRequest")}).result);
    request.onerror = (e) => reject((e.target${AS("IDBRequest")}).error);
  });
}

const LOCK_ID = "_processing_lock";
let isSyncing = false;

/** Acquire a processing lock so the SW knows this client is handling the queue. */
async function acquireProcessingLock()${R("Promise<void>")}{
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put({ id: LOCK_ID, clientId: crypto.randomUUID(), timestamp: Date.now() });
  await new Promise${PT("void")}((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Release the processing lock after queue processing completes. */
async function releaseProcessingLock()${R("Promise<void>")}{
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(LOCK_ID);
  await new Promise${PT("void")}((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Store a write operation in IndexedDB for later sync. Works offline — use it for POST/PUT/PATCH/DELETE when the user might be offline. */
export async function queueMutation(mutation${T("Partial<MutationQueueItem>")})${R("Promise<void>")}{
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

  // Strip auth headers before storing — tokens must never persist in IDB
  const safeHeaders${T("Record<string, string>")} = { ...(mutation.headers || {}) };
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

/** Replay a single queued mutation. Returns true on success, false on failure. */
async function replayMutation(item${T("MutationQueueItem")})${R("Promise<boolean>")}{
  try {
${authReplayHeaders}    let replayBody${T("BodyInit | null")}${ts ? " = null" : ""};
    let contentType${T("string | undefined")};
    const bt = item.bodyType || "json";
    if (bt === "formdata") {
      replayBody = new FormData();
      for (const [key, value] of (item.body || [])${AS("[string, FormDataEntryValue][]")}) {
        replayBody.append(key, value);
      }
    } else if (bt === "blob") {
      replayBody = item.body${AS("BodyInit | null")};
    } else if (bt === "buffer") {
      replayBody = item.body instanceof ArrayBuffer ? new Uint8Array(item.body)${AS("BodyInit")} : item.body${AS("BodyInit")};
    } else {
      replayBody = JSON.stringify(item.body);
      contentType = "application/json";
    }
    const response = await fetch(item.url, {
      method: item.method,
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...item.headers,
${authHeaderSpread}      },
      body: replayBody,
    });

    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);

    if (item.tags && item.tags.length > 0) {
      ${tagInvalidation ? "await invalidateByTags(item.tags);" : "// tagInvalidation disabled — skipping cache invalidation"}
    }

    await removeFromQueue(item.id);
    return true;
  } catch {
    item.retryCount++;
    item.nextRetryAt = Date.now() + RETRY_BACKOFF_MS * Math.pow(2, item.retryCount - 1);
    await updateInQueue(item);
    return false;
  }
}

/** Process all queued mutations in order. Sends them to the server. Runs automatically when mutations are queued or on reconnection. Respects batchSize for progress reporting and batchDelayMs for rate limiting. */
export async function processMutationQueue()${R("Promise<void>")}{
  if (isSyncing) return;
  isSyncing = true;

  try {
    await acquireProcessingLock();
    const db = await openQueueDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("by-timestamp");
    const queue${T("MutationQueueItem[]")} = await new Promise${PT("MutationQueueItem[]")}((resolve, reject) => {
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
        await removeFromQueue(item.id);
        failed++;
        continue;
      }

      // Skip items whose backoff delay hasn't elapsed yet
      if (item.nextRetryAt && Date.now() < item.nextRetryAt) {
        if (item.nextRetryAt < earliestRetry) earliestRetry = item.nextRetryAt;
        continue;
      }

      const ok = await replayMutation(item);
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
          new CustomEvent("mutation-sync-complete", {
            detail: { succeeded, failed, total, current: succeeded + failed },
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
    await releaseProcessingLock();
    isSyncing = false;
    window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
  }
}

/** Immediately process all queued mutations. Call this after re-login to flush mutations that failed due to auth expiry. */
export async function flushMutations()${R("Promise<void>")}{
  await processMutationQueue();
}
`;

  const helpers = `
async function removeFromQueue(id${T("string")})${R("Promise<void>")}{
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  await new Promise${PT("void")}((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateInQueue(item${T("MutationQueueItem")})${R("Promise<void>")}{
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(item);
  await new Promise${PT("void")}((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get the number of queued mutations waiting to be synced. Useful for showing a sync badge. */
export async function getPendingCount()${R("Promise<number>")}{
  const db = await openQueueDB();
  return new Promise${PT("number")}((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve((request${AS("IDBRequest<number>")}).result);
    request.onerror = () => reject((request${AS("IDBRequest")}).error);
  });
}

/** Get the position of a mutation in the queue (0-based). Returns -1 if not found. */
export async function getQueuePosition(id${T("string")})${R("Promise<number>")}{
  const items = await getQueueItems();
  return items.findIndex((item) => item.id === id);
}

/** Get all pending queue items with their details. */
export async function getQueueItems()${R("Promise<MutationQueueItem[]>")}{
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("by-timestamp");
  return new Promise${PT("MutationQueueItem[]")}((resolve, reject) => {
    const request = index.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
`;

  writeFile(ctx, `mutation-queue.${ext}`, code + helpers);
}
