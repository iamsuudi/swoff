/**
 * Generates mutation-queue.js - offline mutation queue with IndexedDB.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateMutationQueue(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const authEnabled = ctx.config.features.auth.enabled;

  const importLines = authEnabled
    ? `import { getAuth } from "./auth-store.${ext}";
`
    : "";

  const authReplayBlock = authEnabled
    ? `  const auth = await getAuth();
  const authHeader = auth?.token ? { Authorization: \`Bearer \${auth.token}\` } : {};
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
 *     storeName: "todos",
 *     tempId: "temp_abc123",
 *   });
 *
 *   // Flush queued mutations (e.g., after login)
 *   await flushMutations();
 *
 *   // Auto-processes on online event
 */

${importLines}const DB_NAME = "swoff-queue";
const STORE_NAME = "mutations";
const MAX_RETRIES = 5;

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by-timestamp", "timestamp");
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

let isSyncing = false;

export async function queueMutation(mutation) {
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  store.add({
    id: crypto.randomUUID(),
    method: mutation.method,
    url: mutation.url,
    body: mutation.body,
    headers: mutation.headers || {},
    previousData: mutation.previousData || null,
    timestamp: Date.now(),
    retryCount: 0,
    tags: mutation.tags || [],
    storeName: mutation.storeName || null,
    tempId: mutation.tempId || null,
  });

  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
}

export async function processMutationQueue() {
  if (!navigator.onLine || isSyncing) return;
  isSyncing = true;

  try {
${authReplayBlock}    const db = await openQueueDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("by-timestamp");
    const queue = await new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    let succeeded = 0;
    let failed = 0;

    for (const item of queue) {
      if (item.retryCount >= MAX_RETRIES) {
        await rollbackMutation(item);
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

        const serverData = await response.json();

        if (item.tempId && item.storeName) {
          await reconcileRecord(item.storeName, item.tempId, serverData);
        }

        if (item.tags && item.tags.length > 0) {
          const { invalidateByTags } = await import("./cache.${ext}");
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

export async function flushMutations() {
  await processMutationQueue();
}
`;

  // Helper functions (unchanged) are appended outside the template string
  const helpers = `
async function removeFromQueue(id) {
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateInQueue(item) {
  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(item);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function rollbackMutation(item) {
  if (!item.storeName) return;

  if (item.method === "POST" && item.tempId) {
    const { deleteRecord } = await import("./store.${ext}");
    await deleteRecord(item.storeName, item.tempId);
  } else if (
    (item.method === "PUT" || item.method === "PATCH") &&
    item.previousData
  ) {
    const { putRecord } = await import("./store.${ext}");
    await putRecord(item.storeName, { ...item.previousData, $synced: true });
  } else if (item.method === "DELETE" && item.tempId && item.previousData) {
    const { putRecord } = await import("./store.${ext}");
    await putRecord(item.storeName, { ...item.previousData, $synced: true });
  }

  window.dispatchEvent(
    new CustomEvent("mutation-rollback", {
      detail: {
        method: item.method,
        url: item.url,
        tempId: item.tempId,
        previousData: item.previousData,
      },
    })
  );
}

async function reconcileRecord(storeName, tempId, serverData) {
  const { getRecord, putRecord, deleteRecord } = await import("./store.${ext}");
  const existing = await getRecord(storeName, tempId);
  if (!existing) return;

  const reconciled = {
    ...existing,
    ...serverData,
    id: serverData.id,
    $synced: true,
    $syncedAt: Date.now(),
  };

  await putRecord(storeName, reconciled);

  if (String(tempId) !== String(serverData.id)) {
    await deleteRecord(storeName, tempId);
  }
}

export async function getPendingCount() {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
`;

  writeFile(ctx, `mutation-queue.${ext}`, code + helpers);
}
