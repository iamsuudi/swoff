import { useState, useEffect } from "react";
import { getPendingCount } from "../mutation-queue.ts";

export function useMutationQueue() {
  const [state, setState] = useState<{
    pending: number;
    lastSync: { succeeded: number; failed: number } | null;
  }>({ pending: 0, lastSync: null });

  useEffect(() => {
    getPendingCount().then((count: number) => setState((s) => ({ ...s, pending: count })));

    const onSync = (e: CustomEvent) => setState({
      pending: 0,
      lastSync: { succeeded: e.detail.succeeded, failed: e.detail.failed },
    });
    const onChange = async () => { const count = await getPendingCount(); setState((s) => ({ ...s, pending: count })); };

    window.addEventListener("mutation-sync-complete", onSync as EventListener);
    window.addEventListener("mutation-queue-changed", onChange);
    return () => {
      window.removeEventListener("mutation-sync-complete", onSync as EventListener);
      window.removeEventListener("mutation-queue-changed", onChange);
    };
  }, []);

  return state;
}
