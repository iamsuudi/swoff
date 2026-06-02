import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithCache } from "../fetch-wrapper.js";
import { generateTags } from "../invalidation-tags.js";

/**
 * Fetch and cache data with automatic invalidation, revalidation, and offline support.
 *
 * Usage:
 *   const { data, error, loading, refetch } = useCachedFetch("/api/todos");
 *
 *   // Select/transform data
 *   const { data: names } = useCachedFetch("/api/users", {
 *     select: (users) => users.map(u => u.name),
 *   });
 *
 *   // Keep previous data while fetching next page
 *   const { data } = useCachedFetch(`/api/items?page=${page}`, {
 *     keepPreviousData: true,
 *   });
 *
 *   // Retry on failure
 *   const { data } = useCachedFetch("/api/todos", { retry: 3 });
 *
 *   // Placeholder data while loading
 *   const { data } = useCachedFetch("/api/todos", {
 *     placeholderData: { items: [] },
 *   });
 */
export function useCachedFetch(url, options = {}) {
  const {
    select,
    retry: retryOpt,
    placeholderData,
    onSuccess,
    onError,
    ...fetchOptions
  } = options;

  const [data, setData] = useState(placeholderData ?? null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refetchCount, setRefetchCount] = useState(0);

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const fetchOptionsRef = useRef(fetchOptions);
  const retryOptRef = useRef(retryOpt);
  const selectRef = useRef(select);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    fetchOptionsRef.current = fetchOptions;
    retryOptRef.current = retryOpt;
    selectRef.current = select;
  });

  const refetch = useCallback(() => setRefetchCount((c) => c + 1), []);

  const isEnabled = options.enabled !== false && url != null;

  useEffect(() => {
    if (!isEnabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let retriesLeft = retryOptRef.current === true ? Infinity : (typeof retryOptRef.current === "number" ? retryOptRef.current : 0);
    const controller = new AbortController();
    setLoading(true);

    const doFetch = async () => {
      try {
        const { response } = await fetchWithCache(url, {
          ...fetchOptionsRef.current,
          signal: controller.signal,
        });
        if (cancelled) return;
        let selected = null;
        if (response) {
          const raw = await response.json();
          selected = selectRef.current ? selectRef.current(raw) : raw;
          setData(selected);
        } else {
          setData(null);
        }
        if (!cancelled) setError(null);
        if (!cancelled) onSuccessRef.current?.(selected);
      } catch (err) {
        if (
          !cancelled &&
          err instanceof DOMException &&
          err.name === "AbortError"
        )
          return;
        if (!cancelled && retriesLeft > 0) {
          retriesLeft--;
          await new Promise((r) => setTimeout(r, 1000));
          return doFetch();
        }
        if (!cancelled) {
          const e = err instanceof Error ? err : new Error(String(err));
          setError(e);
          onErrorRef.current?.(e);
        }
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
