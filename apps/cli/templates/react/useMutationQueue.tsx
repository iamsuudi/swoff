import { useState, useEffect, useCallback } from "react";
import { getPendingCount, getQueueItems, processMutationQueue } from "../offline/queue.ts";
import type { MutationQueueItem } from "../swoff.d.ts";

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
 *   const { pending, items, lastSync, isProcessing, retryAll } = useMutationQueue();
 *
 *   // Show pending badge:
 *   {pending > 0 && <Badge>{pending}</Badge>}
 *
 *   // Retry all queued mutations:
 *   <button onClick={retryAll} disabled={isProcessing}>
 *     {isProcessing ? "Syncing..." : "Retry All"}
 *   </button>
 *
 * @returns {{ pending, items, lastSync, isProcessing, retryAll }}
 */
export function useMutationQueue(): MutationQueueState & { retryAll: () => Promise<void> } {
  const [state, setState] = useState<MutationQueueState>({
    pending: 0,
    items: [],
    lastSync: null,
    isProcessing: false,
  });

  const refresh = useCallback(async () => {
    const [count, items] = await Promise.all([
      getPendingCount(),
      getQueueItems(),
    ]);
    setState((s) => ({ ...s, pending: count, items }));
  }, []);

  useEffect(() => {
    queueMicrotask(() => refresh());

    const onSync = (e: CustomEvent) => {
      setState((s) => ({
        ...s,
        isProcessing: false,
        lastSync: { succeeded: e.detail.succeeded, failed: e.detail.failed },
      }));
      refresh();
    };
    const onChange = () => {
      refresh();
    };
    const onProgress = () => {
      setState((s) => ({ ...s, isProcessing: true }));
    };

    window.addEventListener("mutation-sync-complete", onSync);
    window.addEventListener("mutation-queue-changed", onChange);
    window.addEventListener("mutation-sync-progress", onProgress);
    return () => {
      window.removeEventListener("mutation-sync-complete", onSync);
      window.removeEventListener("mutation-queue-changed", onChange);
      window.removeEventListener("mutation-sync-progress", onProgress);
    };
  }, [refresh]);

  const retryAll = useCallback(async () => {
    setState((s) => ({ ...s, isProcessing: true }));
    try {
      await processMutationQueue();
    } finally {
      await refresh();
      setState((s) => ({ ...s, isProcessing: false }));
    }
  }, [refresh]);

  return { ...state, retryAll };
}
