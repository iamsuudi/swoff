export function generateBackgroundSyncHandler(
  authType: string | undefined,
  batchSize: number,
  batchDelayMs: number,
  retryConfig: { maxRetries: number; backoffMs: number; maxBackoffMs: number; jitterMs: number },
  tagInvalidationEnabled: boolean,
  maxAge?: number,
): string {
  const DB_NAME = "swoff-queue";
  const STORE_NAME = "mutations";

  const COOKIE_AUTH_TYPES = ["cookie", "better-auth", "next-auth", "clerk"];
  const isCookie = authType ? COOKIE_AUTH_TYPES.includes(authType) : false;
  const credentialsLine = isCookie
    ? `          credentials: "same-origin",`
    : "";

  return `
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-mutations") {
    event.waitUntil(processMutationQueueInSW());
  }
});

const SW_BATCH_SIZE = ${batchSize};
const SW_BATCH_DELAY_MS = ${batchDelayMs};
const SW_MAX_RETRIES = ${retryConfig.maxRetries};
const SW_RETRY_BACKOFF_MS = ${retryConfig.backoffMs};
const SW_MAX_BACKOFF_MS = ${retryConfig.maxBackoffMs};
const SW_JITTER_MS = ${retryConfig.jitterMs};
// Bump this when adding new indexes/stores for schema migration
const SW_DB_VERSION = 1;

function swSleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function swBackoffDelay(attempt) {
  const delay = Math.min(SW_RETRY_BACKOFF_MS * Math.pow(2, attempt), SW_MAX_BACKOFF_MS);
  return delay + (SW_JITTER_MS > 0 ? Math.random() * SW_JITTER_MS : 0);
}

async function processMutationQueueInSW() {
  // If any client pages are open, skip entirely — the client always wins when open.
  // Only the SW processes the queue when all tabs are closed (background sync event).
  const activeClients = await self.clients.matchAll();
  if (activeClients.length > 0) return;

  let succeeded = 0;
  let failed = 0;
  const tagsToInvalidate = new Set();
  let db;

  try {
    db = await openDB("${DB_NAME}", SW_DB_VERSION, function(db) {
      if (!db.objectStoreNames.contains("${STORE_NAME}")) {
        const store = db.createObjectStore("${STORE_NAME}", { keyPath: "id" });
        store.createIndex("by-timestamp", "timestamp");
      }
    });

    const tx = db.transaction("${STORE_NAME}", "readwrite");
    const store = tx.objectStore("${STORE_NAME}");
    const index = store.index("by-timestamp");${
      maxAge && maxAge > 0
        ? `
    // Prune entries past max age
    const cutoff = Date.now() - MAX_RUNTIME_CACHE_AGE * 1000;
    const allEntries = await new Promise(function(resolve, reject) {
      var req = index.getAll();
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
    for (const item of allEntries) {
      if (item.retryCount >= SW_MAX_RETRIES || (item.timestamp && item.timestamp < cutoff)) {
        store.delete(item.id);
      }
    }`
        : ""
    }
    const queue = await new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Pre-filter: remove permanently failed items first, then filter for processable ones
    const now = Date.now();
    for (const item of queue) {
      if (item.retryCount >= SW_MAX_RETRIES) {
        store.delete(item.id);
        failed++;
      }
    }
    const processable = queue.filter(item => {
      if (item.retryCount >= SW_MAX_RETRIES) return false;
      return !item.nextRetryAt || now >= item.nextRetryAt;
    });
    const total = processable.length;

    // Collect all mutations to update/remove in a single batch at the end
    const toRemove = [];
    const toUpdate = [];

    for (const item of processable) {
      // Stop processing if browser went offline during sync
      if (!self.navigator.onLine) break;

      // Reconstruct request body based on stored bodyType
      let replayBody = null;
      let contentType;
      const bt = item.bodyType || "json";
      if (bt === "formdata") {
        replayBody = new FormData();
        const entries = item.body || [];
        for (let i = 0; i < entries.length; i++) {
          replayBody.append(entries[i][0], entries[i][1]);
        }
      } else if (bt === "blob") {
        replayBody = item.body;
      } else if (bt === "buffer") {
        replayBody = item.body instanceof ArrayBuffer ? new Uint8Array(item.body) : item.body;
      } else if (bt === "text") {
        replayBody = item.body;
      } else if (item.body != null) {
        replayBody = JSON.stringify(item.body);
        contentType = "application/json";
      }

      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            ...(contentType ? { "Content-Type": contentType } : {}),
            ...item.headers,
          },
          ...(replayBody != null ? { body: replayBody } : {}),
${credentialsLine}        });
        if (!response.ok) throw new Error(\`HTTP \${response.status}\`);

        if (item.tags) {
          item.tags.forEach((tag) => {
            tagsToInvalidate.add(tag);
            if (typeof invalidateByTag !== "undefined") invalidateByTag(tag);
          });
        }

        toRemove.push(item.id);
        succeeded++;
      } catch {
        item.retryCount++;
        if (item.retryCount >= SW_MAX_RETRIES) {
          toRemove.push(item.id);
        } else {
          item.nextRetryAt = Date.now() + swBackoffDelay(item.retryCount - 1);
          toUpdate.push(item);
        }
        failed++;
      }

      // Rate limiting delay between mutations
      if (SW_BATCH_DELAY_MS > 0 && succeeded + failed < total) {
        await swSleep(SW_BATCH_DELAY_MS);
      }

      // Emit progress after every SW_BATCH_SIZE mutations
      if ((succeeded + failed) % SW_BATCH_SIZE === 0 || succeeded + failed === total) {
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({
            type: "BACKGROUND_SYNC_PROGRESS",
            detail: { succeeded, failed, total, current: succeeded + failed },
          });
        }
      }
    }

    // Batch all writes in a single transaction
    const writeTx = db.transaction("${STORE_NAME}", "readwrite");
    const writeStore = writeTx.objectStore("${STORE_NAME}");
    for (const id of toRemove) {
      writeStore.delete(id);
    }
    for (const item of toUpdate) {
      writeStore.put(item);
    }
    await new Promise(function(resolve, reject) {
      writeTx.oncomplete = function() { resolve(); };
      writeTx.onerror = function() { reject(writeTx.error); };
    });
  } catch (err) {
    console.error("Background sync failed:", err);
    const syncClients = await self.clients.matchAll();
    for (const c of syncClients) {
      c.postMessage({
        type: "SW_NOTIFICATION",
        level: "error",
        code: "BACKGROUND_SYNC_FAILED",
        message: "Background sync processing failed",
      });
    }
  } finally {
    if (db) db.close();
  }

  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({
      type: "BACKGROUND_SYNC_COMPLETE",
      detail: { succeeded, failed, tags: [...tagsToInvalidate] },
    });
  }
}
`;
}
