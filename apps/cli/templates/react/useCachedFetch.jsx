import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithCache } from "../fetch/core.js";
import { generateTags } from "../cache/tags.js";

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
  const [loading, setLoading] = useState(
    () => url != null && options.enabled !== false,
  );
  const [refetchCount, setRefetchCount] = useState(0);

  const cachedRef = useRef(placeholderData ?? null);
  const prevSelectedRef = useRef(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  const refetch = useCallback(() => setRefetchCount((c) => c + 1), []);

  const isEnabled = options.enabled !== false && url != null;

  useEffect(() => {
    if (!isEnabled) return;

    let cancelled = false;
    let retriesLeft =
      retryOpt === true
        ? Infinity
        : typeof retryOpt === "number"
          ? retryOpt
          : 0;
    const controller = new AbortController();

    const doFetch = async () => {
      setLoading(true);
      try {
        const { response } = await fetchWithCache(url, {
          ...fetchOptions,
          signal: controller.signal,
        });
        if (cancelled) return;
        let selected = null;
        if (response) {
          const raw = await response.json();
          selected = select ? select(raw) : raw;
          setData(selected);
          cachedRef.current = selected;
          prevSelectedRef.current = selected;
          if (!cancelled) onSuccessRef.current?.(selected);
        } else {
          setData(null);
          cachedRef.current = null;
          prevSelectedRef.current = null;
        }
        if (!cancelled) setError(null);
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
