import { useState, useEffect, useCallback } from "react";
import { getPendingCount, getQueueItems } from "../mutation-queue.ts";
import type { MutationQueueItem } from "../swoff.d.ts";

export interface MutationQueueState {
  pending: number;
  items: MutationQueueItem[];
  lastSync: { succeeded: number; failed: number } | null;
}

export function useMutationQueue() {
  const [state, setState] = useState<MutationQueueState>({
    pending: 0,
    items: [],
    lastSync: null,
  });

  const refresh = useCallback(async () => {
    const [count, items] = await Promise.all([
      getPendingCount(),
      getQueueItems(),
    ]);
    setState((s) => ({ ...s, pending: count, items }));
  }, []);

  useEffect(() => {
    // Defer initial data load to avoid cascading render warning
    queueMicrotask(() => refresh());

    const onSync = (e: CustomEvent) => {
      refresh();
      setState((s) => ({
        ...s,
        lastSync: { succeeded: e.detail.succeeded, failed: e.detail.failed },
      }));
    };
    const onChange = () => {
      refresh();
    };

    window.addEventListener("mutation-sync-complete", onSync);
    window.addEventListener("mutation-queue-changed", onChange);
    return () => {
      window.removeEventListener("mutation-sync-complete", onSync);
      window.removeEventListener("mutation-queue-changed", onChange);
    };
  }, [refresh]);

  return state;
}
