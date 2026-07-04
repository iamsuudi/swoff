import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithCache } from "../fetch/core.ts";
import { generateTags } from "../cache/tags.ts";
import type { FetchWithCacheOptions } from "../fetch/core.ts";

/**
 * Fetch and cache data with automatic invalidation, revalidation, and offline support.
 *
 * Usage:
 *   const { data, error, loading, refetch } = useSwoffFetch<MyType>("/api/todos");
 *
 *   // Select/transform data — skips re-render if selected value hasn't changed
 *   const { data: names } = useSwoffFetch("/api/users", {
 *     select: (users) => users.map(u => u.name),
 *   });
 *
 *   // Keep previous data while fetching the next page
 *   const { data } = useSwoffFetch(`/api/items?page=${page}`, {
 *     keepPreviousData: true,
 *   });
 *
 *   // Retry on failure (default 0 retries)
 *   const { data } = useSwoffFetch("/api/todos", { retry: 3 });
 *
 *   // Placeholder data while loading for the first time
 *   const { data } = useSwoffFetch("/api/todos", {
 *     placeholderData: { items: [] },
 *   });
 *
 *   // Callbacks on success/error
 *   const { data, refetch } = useSwoffFetch("/api/todos", {
 *     onSuccess: (data) => console.log("Loaded", data),
 *   });
 *
 * @param url - URL to fetch. Pass null to skip fetching.
 * @param options - Fetch options plus: select, keepPreviousData, retry, placeholderData, onSuccess, onError
 */
export function useSwoffFetch<T = unknown, R = T>(
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
  const [loading, setLoading] = useState(
    () => url != null && options.enabled !== false,
  );
  const [refetchCount, setRefetchCount] = useState(0);

  const cachedRef = useRef<R | null>(placeholderData ?? null);
  const prevSelectedRef = useRef<R | null>(null);
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
    let retriesLeft: number =
      retryOpt === true
        ? Infinity
        : typeof retryOpt === "number"
          ? retryOpt
          : 0;
    const controller = new AbortController();

    const doFetch = async (): Promise<void> => {
      setLoading(true);
      try {
        const { response } = await fetchWithCache(url, {
          ...fetchOptions,
          signal: controller.signal,
        });
        if (cancelled) return;
        let selected: R | null = null;
        if (response) {
          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
              const errBody = await response.json();
              errorMessage = errBody?.message || errBody?.error || errorMessage;
            } catch {}
            throw new Error(errorMessage);
          }
          const raw: T = await response.json();
          selected = select ? select(raw) : (raw as unknown as R);
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
