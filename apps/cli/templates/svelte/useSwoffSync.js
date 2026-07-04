import { writable } from "svelte/store";
import { onMount } from "svelte";
import { retrySync } from "../mutation/sync.js";

export function useSwoffSync() {
  const supported = writable(
    typeof window !== "undefined" && typeof navigator !== "undefined"
      ? "serviceWorker" in navigator && "SyncManager" in window
      : false,
  );
  const registered = writable(false);
  const lastSync = writable(null);

  onMount(() => {
    function onSyncComplete(e) {
      registered.set(true);
      lastSync.set({ succeeded: e.detail.succeeded, failed: e.detail.failed });
    }

    window.addEventListener("background-sync-complete", onSyncComplete);
    return () => {
      window.removeEventListener("background-sync-complete", onSyncComplete);
    };
  });

  async function triggerSync() {
    await retrySync();
  }

  return { supported, registered, lastSync, triggerSync };
}
