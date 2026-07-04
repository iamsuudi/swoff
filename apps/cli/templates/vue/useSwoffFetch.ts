import { ref, onMounted, onUnmounted, watch } from "vue";
import { fetchWithCache } from "../fetch/core";
import { generateTags } from "../cache/tags";
import type { FetchWithCacheOptions } from "../fetch/core";

/**
 * Fetch and cache data with automatic invalidation, revalidation, and offline support.
 *
 * Usage:
 *   const { data, error, loading, refetch } = useSwoffFetch("/api/todos");
 *
 *   // Select/transform data
 *   const { data: names } = useSwoffFetch("/api/users", {
 *     select: (users) => users.map(u => u.name),
 *   });
 *
 *   // Keep previous data while fetching the next page
 *   const { data } = useSwoffFetch(`/api/items?page=${page}`, {
 *     keepPreviousData: true,
 *   });
 *
 *   @param url - URL to fetch. Pass null to skip fetching.
 *   @param options - Fetch options plus: select, keepPreviousData, retry, placeholderData, onSuccess, onError
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

  const data = ref<R | null>(placeholderData ?? null);
  const error = ref<Error | null>(null);
  const loading = ref(url != null && options.enabled !== false);
  const refetchCount = ref(0);

  let cachedData: R | null = placeholderData ?? null;

  const isEnabled = options.enabled !== false && url != null;

  function refetch() {
    refetchCount.value++;
  }

  watch(
    () => url,
    () => {
      if (isEnabled) refetch();
    },
  );

  watch(
    [() => url, () => refetchCount.value],
    () => {
      if (!isEnabled) return;

      let cancelled = false;
      let retriesLeft: number =
        retryOpt === true
          ? Infinity
          : typeof retryOpt === "number"
            ? retryOpt
            : 0;

      const doFetch = async () => {
        loading.value = true;
        try {
          const { response } = await fetchWithCache(url, fetchOptions);
          if (cancelled) return;
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
            const selected = select ? select(raw) : (raw as unknown as R);
            data.value = selected;
            cachedData = selected;
            if (!cancelled) onSuccess?.(selected);
          } else {
            data.value = null;
            cachedData = null;
          }
          if (!cancelled) error.value = null;
        } catch (err) {
          if (!cancelled && retriesLeft > 0) {
            retriesLeft--;
            await new Promise((r) => setTimeout(r, 1000));
            return doFetch();
          }
          if (!cancelled) {
            const e = err instanceof Error ? err : new Error(String(err));
            error.value = e;
            onError?.(e);
          }
        } finally {
          if (!cancelled) loading.value = false;
        }
      };

      doFetch();
    },
  );

  // Auto-refetch on cache invalidation
  if (isEnabled && url) {
    onMounted(() => {
      function onInvalidated(e: Event) {
        const detail = (e as CustomEvent).detail;
        const tags = detail?.tags;
        if (!tags || !Array.isArray(tags)) return;
        const urlTags = generateTags(url!);
        if (tags.some((t: string) => urlTags.includes(t))) {
          refetch();
        }
      }
      window.addEventListener("cache-invalidated", onInvalidated);
      onUnmounted(() => {
        window.removeEventListener("cache-invalidated", onInvalidated);
      });
    });
  }

  return { data, error, loading, refetch };
}
