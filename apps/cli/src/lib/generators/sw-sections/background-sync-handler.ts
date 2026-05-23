/**
 * Generates Background Sync event handler for the SW.
 * Processes mutation queue when browser sync fires.
 */

export function generateBackgroundSyncHandler(authType?: string): string {
  const credentialsLine = authType === "cookie"
    ? `          credentials: "same-origin",`
    : "";

  return `
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-mutations") {
    event.waitUntil(processMutationQueueInSW());
  }
});

const SW_DB_NAME = "swoff-queue";
const SW_STORE_NAME = "mutations";
const SW_MAX_RETRIES = 5;

async function processMutationQueueInSW() {
  let succeeded = 0;
  let failed = 0;
  const tagsToInvalidate = new Set();

  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(SW_DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(SW_STORE_NAME)) {
          const store = db.createObjectStore(SW_STORE_NAME, { keyPath: "id" });
          store.createIndex("by-timestamp", "timestamp");
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });

    const tx = db.transaction(SW_STORE_NAME, "readonly");
    const store = tx.objectStore(SW_STORE_NAME);
    const index = store.index("by-timestamp");
    const queue = await new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    for (const item of queue) {
      if (item.retryCount >= SW_MAX_RETRIES) {
        await removeFromSWQueue(db, item.id);
        failed++;
        continue;
      }
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: { "Content-Type": "application/json", ...item.headers },
          body: JSON.stringify(item.body),
${credentialsLine}        });
        if (!response.ok) throw new Error(\`HTTP \${response.status}\`);

        if (item.tags) {
          item.tags.forEach((tag) => tagsToInvalidate.add(tag));
        }

        await removeFromSWQueue(db, item.id);
        succeeded++;
      } catch {
        item.retryCount++;
        await updateInSWQueue(db, item);
        failed++;
      }
    }
  } catch (err) {
    console.error("Background sync failed:", err);
  }

  for (const tag of tagsToInvalidate) {
    await invalidateByTag(tag);
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
  const tx = db.transaction(SW_STORE_NAME, "readwrite");
  tx.objectStore(SW_STORE_NAME).delete(id);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateInSWQueue(db, item) {
  const tx = db.transaction(SW_STORE_NAME, "readwrite");
  tx.objectStore(SW_STORE_NAME).put(item);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}`;
}
