import { useCallback } from "react";
import { prefetchCache } from "../fetch-wrapper.js";

export function usePrefetch() {
  const prefetch = useCallback((url, options) => {
    prefetchCache(url, options);
  }, []);

  return prefetch;
}
