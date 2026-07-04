import { ref, onMounted, onUnmounted } from "vue";
import { getStorageEstimate, formatBytes } from "../storage";

/**
 * Reactive storage estimate. Shows available quota and usage.
 *
 * Usage:
 *   const { usage, quota, percentUsed, formattedUsage, formattedQuota, loading } = useSwoffStorage();
 *
 *   <div v-if="!loading && percentUsed > 80">Storage almost full</div>
 *
 * @param autoRefresh - Re-check on visibility change (default true)
 * @returns {{ usage: Ref<number>, quota: Ref<number>, percentUsed: Ref<number>, formattedUsage: Ref<string>, formattedQuota: Ref<string>, loading: Ref<boolean>, error: Ref<string | null> }}
 */
export function useSwoffStorage(autoRefresh = true) {
  const usage = ref(0);
  const quota = ref(0);
  const percentUsed = ref(0);
  const formattedUsage = ref("0 B");
  const formattedQuota = ref("0 B");
  const loading = ref(true);
  const error = ref<string | null>(null);

  async function check() {
    try {
      const result = await getStorageEstimate();
      usage.value = result.usage;
      quota.value = result.quota;
      percentUsed.value = result.percentUsed;
      formattedUsage.value = formatBytes(result.usage);
      formattedQuota.value = formatBytes(result.quota);
      loading.value = false;
      error.value = null;
    } catch (err) {
      loading.value = false;
      error.value = String(err);
    }
  }

  onMounted(() => {
    check();
  });

  if (autoRefresh) {
    onMounted(() => {
      function onVisible() {
        if (document.visibilityState === "visible") check();
      }
      document.addEventListener("visibilitychange", onVisible);
      onUnmounted(() => {
        document.removeEventListener("visibilitychange", onVisible);
      });
    });
  }

  return { usage, quota, percentUsed, formattedUsage, formattedQuota, loading, error };
}
