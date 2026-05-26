import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { fetchWithCache } from "../fetch-wrapper.js";
import { generateTags } from "../invalidation-tags.js";

export function useCachedFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refetchCount, setRefetchCount] = useState(0);
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

  const refetch = useCallback(() => setRefetchCount((c) => c + 1), []);

  useEffect(() => {
    let cancelled = false;
    startTransition(() => setLoading(true));

    const doFetch = async () => {
      try {
        const { response } = await fetchWithCache(url, optionsRef.current);
        if (cancelled) return;
        if (response) {
          setData(await response.json());
        } else {
          setData(null);
        }
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    doFetch();
    return () => { cancelled = true; };
  }, [url, refetchCount]);

  useEffect(() => {
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
  }, [url]);

  return { data, error, loading, refetch };
}
