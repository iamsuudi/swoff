import {
  useState,
  useEffect,
  useCallback,
  useRef,
  startTransition,
} from "react";
import { fetchWithCache } from "../fetch-wrapper.ts";
import { generateTags } from "../invalidation-tags.ts";
import type { FetchWithCacheOptions } from "../fetch-wrapper.ts";

export function useCachedFetch<T>(
  url: string | null,
  options: FetchWithCacheOptions & {
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
    refetchInterval?: number;
    enabled?: boolean;
  } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetchCount, setRefetchCount] = useState(0);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const refetch = useCallback(() => setRefetchCount((c) => c + 1), []);

  const isEnabled = options.enabled !== false && url != null;

  useEffect(() => {
    if (!isEnabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    startTransition(() => setLoading(true));

    const doFetch = async () => {
      try {
        const { response } = await fetchWithCache(url, {
          ...optionsRef.current,
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
        if (!cancelled)
          setError(err instanceof Error ? err : new Error(String(err)));
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

  // Auto-refetch on window focus
  useEffect(() => {
    if (!options.refetchOnWindowFocus || !isEnabled) return;
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [options.refetchOnWindowFocus, refetch, isEnabled]);

  // Auto-refetch on reconnect
  useEffect(() => {
    if (!options.refetchOnReconnect || !isEnabled) return;
    const onOnline = () => refetch();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [options.refetchOnReconnect, refetch, isEnabled]);

  // Auto-refetch on interval
  useEffect(() => {
    if (!options.refetchInterval || options.refetchInterval <= 0 || !isEnabled) return;
    const id = setInterval(refetch, options.refetchInterval * 1000);
    return () => clearInterval(id);
  }, [options.refetchInterval, refetch, isEnabled]);

  return { data, error, loading, refetch };
}
