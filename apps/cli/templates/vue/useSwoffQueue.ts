import { ref, onMounted, onUnmounted } from "vue";
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

/**
 * Reactive mutation queue state: pending count, items, last sync info, and processing flag.
 *
 * Usage:
 *   const { pending, items, lastSync, isProcessing, retryAll } = useSwoffQueue();
 *
 *   // Show pending badge:
 *   <span v-if="pending > 0">{{ pending }} pending</span>
 *
 *   // Retry all queued mutations:
 *   <button @click="retryAll" :disabled="isProcessing">
 *     {{ isProcessing ? "Syncing..." : "Retry All" }}
 *   </button>
 *
 * @returns {{ pending, items, lastSync, isProcessing, retryAll }}
 */
export function useSwoffQueue(): MutationQueueState & {
  retryAll: () => Promise<void>;
} {
  const pending = ref(0);
  const items = ref<MutationQueueItem[]>([]);
  const lastSync = ref<{ succeeded: number; failed: number } | null>(null);
  const isProcessing = ref(false);

  async function refresh() {
    const [count, queueItems] = await Promise.all([
      getPendingCount(),
      getQueueItems(),
    ]);
    pending.value = count;
    items.value = queueItems;
  }

  onMounted(() => {
    queueMicrotask(() => refresh());

    function onSync(e: CustomEvent) {
      isProcessing.value = false;
      lastSync.value = { succeeded: e.detail.succeeded, failed: e.detail.failed };
      refresh();
    }
    function onChange() { refresh(); }
    function onProgress() { isProcessing.value = true; }

    window.addEventListener("mutation-sync-complete", onSync);
    window.addEventListener("mutation-queue-changed", onChange);
    window.addEventListener("mutation-sync-progress", onProgress);

    onUnmounted(() => {
      window.removeEventListener("mutation-sync-complete", onSync);
      window.removeEventListener("mutation-queue-changed", onChange);
      window.removeEventListener("mutation-sync-progress", onProgress);
    });
  });

  async function retryAll() {
    isProcessing.value = true;
    try {
      await processMutationQueue();
    } finally {
      await refresh();
      isProcessing.value = false;
    }
  }

  return { pending, items, lastSync, isProcessing, retryAll };
}
