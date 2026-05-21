/**
 * Generates background-sync.js - Background Sync API registration.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateBackgroundSync(ctx: GeneratorContext): void {
  const code = `/**
 * Swoff Background Sync
 * Register sync events for processing mutation queue after tab close.
 * Falls back to online event listener in unsupported browsers.
 *
 * Usage:
 *   import { syncWhenPossible } from './swoff/background-sync.js';
 *
 *   await syncWhenPossible({
 *     method: "POST",
 *     url: "/api/todos",
 *     body: { title: "Grocery" },
 *     tags: ["todos"],
 *     storeName: "todos",
 *     tempId: "temp_abc123",
 *   });
 */

import { queueMutation, processMutationQueue, getPendingCount } from "./mutation-queue.js";

const SYNC_TAG = "sync-mutations";

async function registerSync() {
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

export async function syncWhenPossible(mutation) {
  await queueMutation(mutation);
  await registerSync();
}

export async function retrySync() {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return;
  const count = await getPendingCount();
  if (count > 0) {
    await registerSync();
  }
}

window.addEventListener("mutation-sync-complete", retrySync);
`;

  writeFile(ctx, "background-sync.js", code);
}
