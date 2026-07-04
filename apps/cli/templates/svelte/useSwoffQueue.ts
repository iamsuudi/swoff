import { writable } from "svelte/store";
import { onMount } from "svelte";
import {
  getPendingCount,
  getQueueItems,
  processMutationQueue,
} from "../mutation/queue";
import type { MutationQueueItem } from "../swoff.d";

export interface MutationQueueState {
  pending: number;
  items: MutationQueueItem[];
  lastSync: { succeeded: number; failed: number } | null;
  isProcessing: boolean;
}

export function useSwoffQueue(): MutationQueueState & {
  retryAll: () => Promise<void>;
} {
  const pending = writable(0);
  const items = writable<MutationQueueItem[]>([]);
  const lastSync = writable<{ succeeded: number; failed: number } | null>(null);
  const isProcessing = writable(false);

  async function refresh() {
    const [count, queueItems] = await Promise.all([
      getPendingCount(),
      getQueueItems(),
    ]);
    pending.set(count);
    items.set(queueItems);
  }

  onMount(() => {
    queueMicrotask(() => refresh());

    function onSync(e: CustomEvent) {
      isProcessing.set(false);
      lastSync.set({ succeeded: e.detail.succeeded, failed: e.detail.failed });
      refresh();
    }
    function onChange() { refresh(); }
    function onProgress() { isProcessing.set(true); }

    window.addEventListener("mutation-sync-complete", onSync);
    window.addEventListener("mutation-queue-changed", onChange);
    window.addEventListener("mutation-sync-progress", onProgress);

    return () => {
      window.removeEventListener("mutation-sync-complete", onSync);
      window.removeEventListener("mutation-queue-changed", onChange);
      window.removeEventListener("mutation-sync-progress", onProgress);
    };
  });

  async function retryAll() {
    isProcessing.set(true);
    try {
      await processMutationQueue();
    } finally {
      await refresh();
      isProcessing.set(false);
    }
  }

  return { pending, items, lastSync, isProcessing, retryAll };
}
