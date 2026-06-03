import { useCallback, useState } from "react";
import { prefetchCache } from "../fetch/core.js";

/**
 * Hook that returns a stable prefetch callback, observable prefetch list, and clear function.
 *
 * Usage:
 *   const { prefetch, prefetchList, clear } = usePrefetch();
 *
 *   // Prefetch when user hovers a link:
 *   <Link onMouseEnter={() => prefetch("/api/todos")} to="/todos" />
 *
 *   // Show how many URLs are prefetched:
 *   <span>{prefetchList.length} routes cached</span>
 *
 *   // Clear prefetched data:
 *   <button onClick={clear}>Clear prefetch</button>
 */
export function usePrefetch() {
  const [prefetchList, setPrefetchList] = useState([]);

  const prefetch = useCallback((url, options) => {
    prefetchCache(url, options);
    setPrefetchList((list) => list.includes(url) ? list : [...list, url]);
  }, []);

  const clear = useCallback(() => {
    setPrefetchList([]);
  }, []);

  return { prefetch, prefetchList, clear };
}
