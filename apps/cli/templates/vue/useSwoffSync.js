import { ref, onMounted, onUnmounted } from "vue";
import { retrySync } from "../mutation/sync.js";

export function useSwoffSync() {
  const supported = ref(
    typeof window !== "undefined" && typeof navigator !== "undefined"
      ? "serviceWorker" in navigator && "SyncManager" in window
      : false,
  );
  const registered = ref(false);
  const lastSync = ref(null);

  onMounted(() => {
    function onSyncComplete(e) {
      registered.value = true;
      lastSync.value = { succeeded: e.detail.succeeded, failed: e.detail.failed };
    }

    window.addEventListener("background-sync-complete", onSyncComplete);
    onUnmounted(() => {
      window.removeEventListener("background-sync-complete", onSyncComplete);
    });
  });

  async function triggerSync() {
    await retrySync();
  }

  return { supported, registered, lastSync, triggerSync };
}
