import { writable } from "svelte/store";
import { prefetchCache } from "../fetch/core";
import type { FetchWithCacheOptions } from "../fetch/core";

export function useSwoffPrefetch() {
  const prefetchList = writable<string[]>([]);

  function prefetch(url: string, options?: FetchWithCacheOptions) {
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
