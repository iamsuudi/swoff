import { useState, useEffect, useCallback } from "react";
import { retrySync } from "../mutation/sync.ts";

export function useSwoffSync() {
  const [state, setState] = useState(() => ({
    supported:
      typeof window !== "undefined" && typeof navigator !== "undefined"
        ? "serviceWorker" in navigator && "SyncManager" in window
        : false,
    registered: false,
    lastSync: null as { succeeded: number; failed: number } | null,
  }));

  useEffect(() => {
    const onSyncComplete = (e: CustomEvent) => {
      setState((s) => ({
        ...s,
        registered: true,
        lastSync: { succeeded: e.detail.succeeded, failed: e.detail.failed },
      }));
    };

    window.addEventListener("background-sync-complete", onSyncComplete);
    return () => {
      window.removeEventListener("background-sync-complete", onSyncComplete);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    await retrySync();
  }, []);

  return { ...state, triggerSync };
}
