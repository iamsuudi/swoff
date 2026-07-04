import { writable } from "svelte/store";
import { prefetchCache } from "../fetch/core.js";

export function useSwoffPrefetch() {
  const prefetchList = writable([]);

  function prefetch(url, options) {
    prefetchCache(url, options);
    prefetchList.update((list) =>
      list.includes(url) ? list : [...list, url],
    );
  }

  function clear() {
    prefetchList.set([]);
  }

  return { prefetch, prefetchList, clear };
}
