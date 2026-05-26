import { useState, useEffect, useCallback } from "react";
import { retrySync } from "../background-sync.js";

export function useBackgroundSync() {
  const [state, setState] = useState({
    supported: "serviceWorker" in navigator && "SyncManager" in window,
    registered: false,
    lastSync: null,
  });

  useEffect(() => {
    const onSyncComplete = (e) => {
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
