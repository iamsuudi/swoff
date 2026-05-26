import {
  useState,
  useEffect,
  useCallback,
  useRef,
  startTransition,
} from "react";
import { fetchWithCache } from "../fetch-wrapper.ts";
import { generateTags } from "../invalidation-tags.ts";

export function useCachedFetch<T>(
  url: string,
  options: Parameters<typeof fetchWithCache>[1] = {},
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
        if (!cancelled)
          setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    doFetch();
    return () => {
      cancelled = true;
    };
  }, [url, refetchCount]);

  useEffect(() => {
    const onInvalidated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const tags = detail?.tags;
      if (!tags || !Array.isArray(tags)) return;
      const urlTags = generateTags(url);
      if (tags.some((t: string) => urlTags.includes(t))) {
        setRefetchCount((c) => c + 1);
      }
    };
    window.addEventListener("cache-invalidated", onInvalidated);
    return () => window.removeEventListener("cache-invalidated", onInvalidated);
  }, [url]);

  return { data, error, loading, refetch };
}
