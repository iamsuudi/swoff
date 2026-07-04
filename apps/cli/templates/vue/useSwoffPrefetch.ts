import { ref } from "vue";
import { prefetchCache } from "../fetch/core";
import type { FetchWithCacheOptions } from "../fetch/core";

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
 *
 * @returns {{ prefetch: (url: string, options?: FetchWithCacheOptions) => void, prefetchList: string[], clear: () => void }}
 */
export function useSwoffPrefetch(): {
  prefetch: (url: string, options?: FetchWithCacheOptions) => void;
  prefetchList: string[];
  clear: () => void;
} {
  const prefetchList = ref<string[]>([]);

  function prefetch(url: string, options?: FetchWithCacheOptions) {
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
