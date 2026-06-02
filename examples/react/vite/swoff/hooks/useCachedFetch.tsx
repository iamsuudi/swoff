import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithCache } from "../fetch-wrapper.ts";
import { generateTags } from "../invalidation-tags.ts";
import type { FetchWithCacheOptions } from "../fetch-wrapper.ts";

/**
 * Fetch and cache data with automatic invalidation, revalidation, and offline support.
 *
 * Usage:
 *   const { data, error, loading, refetch } = useCachedFetch<MyType>("/api/todos");
 *
 *   // Select/transform data — skips re-render if selected value hasn't changed
 *   const { data: names } = useCachedFetch("/api/users", {
 *     select: (users) => users.map(u => u.name),
 *   });
 *
 *   // Keep previous data while fetching the next page
 *   const { data } = useCachedFetch(`/api/items?page=${page}`, {
 *     keepPreviousData: true,
 *   });
 *
 *   // Retry on failure (default 0 retries)
 *   const { data } = useCachedFetch("/api/todos", { retry: 3 });
 *
 *   // Placeholder data while loading for the first time
 *   const { data } = useCachedFetch("/api/todos", {
 *     placeholderData: { items: [] },
 *   });
 *
 *   // Callbacks on success/error
 *   const { data, refetch } = useCachedFetch("/api/todos", {
 *     onSuccess: (data) => console.log("Loaded", data),
 *   });
 *
 * @param url - URL to fetch. Pass null to skip fetching.
 * @param options - Fetch options plus: select, keepPreviousData, retry, placeholderData, onSuccess, onError
 */
export function useCachedFetch<T = unknown, R = T>(
  url: string | null,
  options: FetchWithCacheOptions & {
    enabled?: boolean;
    select?: (data: T) => R;
    keepPreviousData?: boolean;
    retry?: number | boolean;
    placeholderData?: R;
    onSuccess?: (data: R) => void;
    onError?: (error: Error) => void;
  } = {},
) {
  const {
    select,
    retry: retryOpt,
    placeholderData,
    onSuccess,
    onError,
    ...fetchOptions
  } = options;

  const [data, setData] = useState<R | null>(placeholderData ?? null);
  const [error, setError] = useState<Error | null>(null);
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
    let retriesLeft: number =
      retryOptRef.current === true
        ? Infinity
        : typeof retryOptRef.current === "number"
          ? retryOptRef.current
          : 0;
    const controller = new AbortController();
    setLoading(true);

    const doFetch = async (): Promise<void> => {
      try {
        const { response } = await fetchWithCache(url, {
          ...fetchOptionsRef.current,
          signal: controller.signal,
        });
        if (cancelled) return;
        let selected: R | null = null;
        if (response) {
          const raw: T = await response.json();
          selected = selectRef.current ? selectRef.current(raw) : (raw as unknown as R);
          setData(selected);
        } else {
          setData(null);
        }
        if (!cancelled) setError(null);
        if (!cancelled)
          onSuccessRef.current?.(selected ?? (null as unknown as R));
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
    const onInvalidated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const tags = detail?.tags;
      if (!tags || !Array.isArray(tags)) return;
      const urlTags = generateTags(url!);
      if (tags.some((t: string) => urlTags.includes(t))) {
        setRefetchCount((c) => c + 1);
      }
    };
    window.addEventListener("cache-invalidated", onInvalidated);
    return () => window.removeEventListener("cache-invalidated", onInvalidated);
  }, [url, isEnabled]);

  return { data, error, loading, refetch };
}
