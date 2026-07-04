import { ref } from "vue";
import { prefetchCache } from "../fetch/core.js";
/**
 * Composable that returns a stable prefetch callback, observable prefetch list, and clear function.
 *
 * Usage:
 *   const { prefetch, prefetchList, clear } = useSwoffPrefetch();
 *
 *   // Prefetch when user hovers a link:
 *   <button @mouseenter="prefetch('/api/todos')">Load</button>
 *
 *   // Show how many URLs are prefetched:
 *   <span>{{ prefetchList.length }} routes cached</span>
 *
 *   // Clear prefetched data:
 *   <button @click="clear">Clear prefetch</button>
 */
export function useSwoffPrefetch() {
  const prefetchList = ref([]);

  function prefetch(url, options) {
    prefetchCache(url, options);
    if (!prefetchList.value.includes(url)) {
      prefetchList.value = [...prefetchList.value, url];
    }
  }

  function clear() {
    prefetchList.value = [];
  }

  return { prefetch, prefetchList: prefetchList.value, clear };
}
