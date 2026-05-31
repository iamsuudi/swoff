/**
 * Swoff Background Sync
 * Register sync events for processing mutation queue after tab close.
 * Falls back to online event listener in unsupported browsers.
 *
 * Usage:
 *   import { syncWhenPossible } from './swoff/background-sync.ts';
 *
 *   await syncWhenPossible({
 *     method: "POST",
 *     url: "/api/todos",
 *     body: { title: "Grocery" },
 *     tags: ["todos"],
 *     tags: ["todos"],
 *   });
 */

import { queueMutation, processMutationQueue, getPendingCount } from "./mutation-queue.ts";

const SYNC_TAG = "sync-mutations";

async function registerSync(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) {
    window.addEventListener("online", processMutationQueue, { once: true });
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(SYNC_TAG);
  } catch {
    window.addEventListener("online", processMutationQueue, { once: true });
  }
}

/** Queue a mutation and register a background sync event so it runs even after tab close. */
export async function syncWhenPossible(mutation: object): Promise<void> {
  await queueMutation(mutation);
  await registerSync();
}

/** Re-register a background sync if mutations are still pending. Called automatically after each sync cycle. */
export async function retrySync(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return;
  const count = await getPendingCount();
  if (count > 0) {
    await registerSync();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("mutation-sync-complete", retrySync);
}
