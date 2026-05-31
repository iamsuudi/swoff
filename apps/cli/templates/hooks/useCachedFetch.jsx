import { useState, useEffect, useCallback, startTransition } from "react";
import { fetchWithCache } from "../fetch-wrapper.js";
import { generateTags } from "../invalidation-tags.js";

export function useCachedFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refetchCount, setRefetchCount] = useState(0);

  const refetch = useCallback(() => setRefetchCount((c) => c + 1), []);

  const isEnabled = options.enabled !== false && url != null;

  useEffect(() => {
    if (!isEnabled) {
      startTransition(() => setLoading(false));
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    startTransition(() => setLoading(true));

    const doFetch = async () => {
      try {
        const { response } = await fetchWithCache(url, {
          ...options,
          signal: controller.signal,
        });
        if (cancelled) return;
        if (response) {
          setData(await response.json());
        } else {
          setData(null);
        }
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled && err instanceof DOMException && err.name === "AbortError") return;
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    doFetch();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url, refetchCount, isEnabled]);

  // Auto-refetch on cache invalidation
  useEffect(() => {
    if (!isEnabled) return;
    const onInvalidated = (e) => {
      const detail = e.detail;
      const tags = detail?.tags;
      if (!tags || !Array.isArray(tags)) return;
      const urlTags = generateTags(url);
      if (tags.some((t) => urlTags.includes(t))) {
        setRefetchCount((c) => c + 1);
      }
    };
    window.addEventListener("cache-invalidated", onInvalidated);
    return () => window.removeEventListener("cache-invalidated", onInvalidated);
  }, [url, isEnabled]);

  return { data, error, loading, refetch };
}
