export function generateBackgroundSyncHandler(authType: string | undefined, batchSize: number, batchDelayMs: number, maxRetries: number, retryBackoffMs: number): string {
  const DB_NAME = "swoff-queue";
  const STORE_NAME = "mutations";

  const credentialsLine = authType === "cookie"
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
const SW_MAX_RETRIES = ${maxRetries};
const SW_RETRY_BACKOFF_MS = ${retryBackoffMs};

function swSleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processMutationQueueInSW() {
  // If client pages are open, check if a client is already processing the queue
  const activeClients = await self.clients.matchAll();
  if (activeClients.length > 0) {
    try {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("${DB_NAME}", 1);
        request.onupgradeneeded = (e) => {
          const d = e.target.result;
          if (!d.objectStoreNames.contains("${STORE_NAME}")) {
            d.createObjectStore("${STORE_NAME}", { keyPath: "id" });
          }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
      });
      const tx = db.transaction("${STORE_NAME}", "readonly");
      const store = tx.objectStore("${STORE_NAME}");
      const lock = await new Promise((resolve, reject) => {
        const req = store.get("_processing_lock");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      if (lock && Date.now() - lock.timestamp < 5000) {
        return; // Client is handling it
      }
    } catch {
      // If lock check fails, proceed with processing
    }
  }

  let succeeded = 0;
  let failed = 0;
  const tagsToInvalidate = new Set();

  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("${DB_NAME}", 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("${STORE_NAME}")) {
          const store = db.createObjectStore("${STORE_NAME}", { keyPath: "id" });
          store.createIndex("by-timestamp", "timestamp");
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });

    const tx = db.transaction("${STORE_NAME}", "readonly");
    const store = tx.objectStore("${STORE_NAME}");
    const index = store.index("by-timestamp");
    const queue = await new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const total = queue.length;
    for (const item of queue) {
      if (item.retryCount >= SW_MAX_RETRIES) {
        await removeFromSWQueue(db, item.id);
        failed++;
        continue;
      }

      // Skip items whose backoff delay hasn't elapsed yet
      if (item.nextRetryAt && Date.now() < item.nextRetryAt) {
        continue;
      }

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
      } else {
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
          body: replayBody,
${credentialsLine}        });
        if (!response.ok) throw new Error(\`HTTP \${response.status}\`);

        if (item.tags) {
          item.tags.forEach((tag) => {
            tagsToInvalidate.add(tag);
            invalidateByTag(tag);
          });
        }

        await removeFromSWQueue(db, item.id);
        succeeded++;
      } catch {
        item.retryCount++;
        item.nextRetryAt = Date.now() + SW_RETRY_BACKOFF_MS * Math.pow(2, item.retryCount - 1);
        await updateInSWQueue(db, item);
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
  } catch (err) {
    console.error("Background sync failed:", err);
  }

  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({
      type: "BACKGROUND_SYNC_COMPLETE",
      detail: { succeeded, failed, tags: [...tagsToInvalidate] },
    });
  }
}

async function removeFromSWQueue(db, id) {
  const tx = db.transaction("${STORE_NAME}", "readwrite");
  tx.objectStore("${STORE_NAME}").delete(id);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateInSWQueue(db, item) {
  const tx = db.transaction("${STORE_NAME}", "readwrite");
  tx.objectStore("${STORE_NAME}").put(item);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}`;
}
