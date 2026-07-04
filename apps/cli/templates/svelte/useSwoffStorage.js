import { writable } from "svelte/store";
import { onMount } from "svelte";
import { getStorageEstimate, formatBytes } from "../storage.js";

export function useSwoffStorage(autoRefresh = true) {
  const usage = writable(0);
  const quota = writable(0);
  const percentUsed = writable(0);
  const formattedUsage = writable("0 B");
  const formattedQuota = writable("0 B");
  const loading = writable(true);
  const error = writable(null);

  async function check() {
    try {
      const result = await getStorageEstimate();
      usage.set(result.usage);
      quota.set(result.quota);
      percentUsed.set(result.percentUsed);
      formattedUsage.set(formatBytes(result.usage));
      formattedQuota.set(formatBytes(result.quota));
      loading.set(false);
      error.set(null);
    } catch (err) {
      loading.set(false);
      error.set(String(err));
    }
  }

  onMount(() => {
    check();
  });

  if (autoRefresh) {
    onMount(() => {
      function onVisible() {
        if (document.visibilityState === "visible") check();
      }
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        document.removeEventListener("visibilitychange", onVisible);
      };
    });
  }

  return { usage, quota, percentUsed, formattedUsage, formattedQuota, loading, error };
}
