/**
 * Generates mutation-queue.js - offline mutation queue with IndexedDB.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateMutationQueue(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");
  const PT = (type: string) => (ts ? `<${type}>` : "");
  const AS = (type: string) => (ts ? ` as ${type}` : "");
  const authEnabled = ctx.config.features.auth.enabled;

  const importLines = authEnabled
    ? `import { getAuth } from "./auth/store.${ext}";
`
    : "";

  const additionalImports = `import { invalidateByTags } from "./cache.${ext}";
${ts ? `import type { MutationQueueItem } from "./swoff.d.ts";
` : ""}`;

  const authReplayBlock = authEnabled
    ? `  const auth = await getAuth();
  const authHeader${T("Record<string, string>")} = auth?.token ? { Authorization: \`Bearer \${auth.token}\` } : {};
`
    : "";

  const authHeadersSpread = authEnabled
    ? `            ...authHeader,`
    : "";

  const code = `/**
 * Swoff Mutation Queue
 * Queue offline writes and sync when connection returns.
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
 */

${importLines}${additionalImports}const DB_NAME = "swoff-queue";
const STORE_NAME = "mutations";
const MAX_RETRIES = 5;

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

let isSyncing = false;

/** Store a write operation in IndexedDB for later sync. Works offline — use it for POST/PUT/PATCH/DELETE when the user might be offline. */
export async function queueMutation(mutation${T("Partial<MutationQueueItem>")})${R("Promise<void>")}{
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  store.add({
    id: crypto.randomUUID(),
    method: mutation.method,
    url: mutation.url,
    body: mutation.body,
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
export async function processMutationQueue()${R("Promise<void>")}{
  if (!navigator.onLine || isSyncing) return;
  isSyncing = true;

  try {
${authReplayBlock}    const db = await openQueueDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("by-timestamp");
    const queue${T("MutationQueueItem[]")} = await new Promise${PT("MutationQueueItem[]")}((resolve, reject) => {
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
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            "Content-Type": "application/json",
${authHeadersSpread}            ...item.headers,
          },
          body: JSON.stringify(item.body),
        });

        if (!response.ok) throw new Error(\`HTTP \${response.status}\`);

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
export async function flushMutations()${R("Promise<void>")}{
  await processMutationQueue();
}
`;

  // Helper functions appended outside the template string
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
`;

  writeFile(ctx, `mutation-queue.${ext}`, code + helpers);
}
