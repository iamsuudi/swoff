import { useCallback } from "react";
import { prefetchCache } from "../fetch-wrapper.ts";
import type { FetchWithCacheOptions } from "../fetch-wrapper.ts";

/**
 * Hook that returns a stable prefetch callback for warming the SW cache.
 * Useful for route-level prefetching, link hover prefetching, etc.
 *
 * Usage:
 *   const prefetch = usePrefetch();
 *   <Link onMouseEnter={() => prefetch("/api/todos")} to="/todos" />
 */
export function usePrefetch(): (
  url: string,
  options?: FetchWithCacheOptions,
) => void {
  const prefetch = useCallback(
    (url: string, options?: FetchWithCacheOptions) => {
      prefetchCache(url, options);
    },
    [],
  );

  return prefetch;
}
