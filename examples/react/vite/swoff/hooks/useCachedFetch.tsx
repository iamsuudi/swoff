import {
  useState,
  useEffect,
  useCallback,
  startTransition,
} from "react";
import { fetchWithCache } from "../fetch-wrapper.ts";
import { generateTags } from "../invalidation-tags.ts";
import type { FetchWithCacheOptions } from "../fetch-wrapper.ts";

/**
 * Fetch and cache data with automatic invalidation, revalidation, and offline support.
 *
 * Caches responses through the service worker. Automatically refetches when the
 * cache is invalidated (by tag, mutation, or explicit invalidateUrl call).
 *
 * Supports all fetchWithCache options: auth, strategy, staleTime, tags,
 * invalidate, queueOffline, and AbortController via signal.
 *
 * Usage:
 *   const { data, error, loading, refetch } = useCachedFetch<MyType>("/api/todos");
 *
 *   // With auth (works with cookie and bearer auth types):
 *   const { data: user } = useCachedFetch("/api/me", { auth: true });
 *
 *   // Disable auto-fetch:
 *   const { data } = useCachedFetch(url, { enabled: false });
 *
 *   // Manual refetch:
 *   const { data, refetch } = useCachedFetch("/api/todos");
 *   <button onClick={refetch}>Refresh</button>
 *
 *   // Auth behavior:
 *   - Cookie auth: credentials are sent automatically, no extra config needed.
 *   - Bearer auth: set `auth: true` to attach the token (from auth/store.ts).
 *     The hook handles 401 → auto-refresh → retry via fetchWithCache.
 *
 *   // Network status: fetchWithCache falls back to cached data when offline.
 *   // Use useNetworkStatus() separately to show offline UI.
 *
 * @param url - The URL to fetch. Pass null to skip fetching (e.g., when id is not ready).
 * @param options - Fetch options, plus `enabled` to control auto-fetching.
 * @returns { data, error, loading, refetch }
 */
export function useCachedFetch<T>(
  url: string | null,
  options: FetchWithCacheOptions & {
    enabled?: boolean;
  } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
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

  return { data, error, loading, refetch };
}
