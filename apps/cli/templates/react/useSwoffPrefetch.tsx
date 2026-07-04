import { useCallback, useState } from "react";
import { prefetchCache } from "../fetch/core.ts";
import type { FetchWithCacheOptions } from "../fetch/core.ts";

/**
 * Hook that returns a stable prefetch callback, observable prefetch list, and clear function.
 *
 * Usage:
 *   const { prefetch, prefetchList, clear } = useSwoffPrefetch();
 *
 *   // Prefetch when user hovers a link:
 *   <Link onMouseEnter={() => prefetch("/api/todos")} to="/todos" />
 *
 *   // Show how many URLs are prefetched:
 *   <span>{prefetchList.length} routes cached</span>
 *
 *   // Clear prefetched data:
 *   <button onClick={clear}>Clear prefetch</button>
 *
 * @returns {{ prefetch: (url: string, options?: FetchWithCacheOptions) => void, prefetchList: string[], clear: () => void }}
 */
export function useSwoffPrefetch(): {
  prefetch: (url: string, options?: FetchWithCacheOptions) => void;
  prefetchList: string[];
  clear: () => void;
} {
  const [prefetchList, setPrefetchList] = useState<string[]>([]);

  const prefetch = useCallback(
    (url: string, options?: FetchWithCacheOptions) => {
      prefetchCache(url, options);
      setPrefetchList((list) => list.includes(url) ? list : [...list, url]);
    },
    [],
  );

  const clear = useCallback(() => {
    setPrefetchList([]);
  }, []);

  return { prefetch, prefetchList, clear };
}
