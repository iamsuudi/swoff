/**
 * Generates mutation-queue.js - offline mutation queue with IndexedDB.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateMutationQueue(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");
  const authEnabled = ctx.config.features.auth.enabled;

  const importLines = authEnabled
    ? `import { getAuth } from "./auth/store.${ext}";
`
    : "";

  const additionalImports = `import { invalidateByTags } from "./cache.${ext}";
import { getRecord, putRecord, deleteRecord } from "./store.${ext}";
`;

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

${importLines}${additionalImports}const DB_NAME = "swoff-queue";
const STORE_NAME = "mutations";
const MAX_RETRIES = 5;

function openQueueDB${R("Promise<IDBDatabase>")}{
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

export async function queueMutation(mutation${T("object")}${R("Promise<void>")}{
export async function processMutationQueue()${R("Promise<void>")}{
export async function flushMutations()${R("Promise<void>")}{
  await processMutationQueue();
}
`;

  // Helper functions (unchanged) are appended outside the template string
  const helpers = `
async function removeFromQueue(id${T("string")}${R("Promise<void>")}{
async function updateInQueue(item${T("object")}${R("Promise<void>")}{
async function rollbackMutation(item${T("object")}${R("Promise<void>")}{
async function reconcileRecord(storeName${T("string")}, tempId${T("string")}, serverData${T("object")}${R("Promise<void>")}{
export async function getPendingCount()${R("Promise<number>")}{
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
