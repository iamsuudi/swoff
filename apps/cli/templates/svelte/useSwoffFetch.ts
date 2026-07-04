import { writable } from "svelte/store";
import { onMount } from "svelte";
import { fetchWithCache } from "../fetch/core";
import { generateTags } from "../cache/tags";
import type { FetchWithCacheOptions } from "../fetch/core";

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

  const data = writable<R | null>(placeholderData ?? null);
  const error = writable<Error | null>(null);
  const loading = writable(url != null && options.enabled !== false);

  const isEnabled = options.enabled !== false && url != null;
  let refetchCount = 0;

  function refetch() {
    refetchCount++;
    doFetch();
  }

  let cancelled = false;

  async function doFetch() {
    if (!isEnabled) return;
    const currentFetchId = refetchCount;

    let retriesLeft: number =
      retryOpt === true
        ? Infinity
        : typeof retryOpt === "number"
          ? retryOpt
          : 0;

    loading.set(true);
    try {
      const { response } = await fetchWithCache(url, fetchOptions);
      if (currentFetchId !== refetchCount) return;
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
        data.set(selected);
        error.set(null);
        onSuccess?.(selected);
      } else {
        data.set(null);
      }
    } catch (err) {
      if (currentFetchId !== refetchCount) return;
      if (retriesLeft > 0) {
        retriesLeft--;
        await new Promise((r) => setTimeout(r, 1000));
        return doFetch();
      }
      const e = err instanceof Error ? err : new Error(String(err));
      error.set(e);
      onError?.(e);
    } finally {
      if (currentFetchId === refetchCount) {
        loading.set(false);
      }
    }
  }

  onMount(() => {
    if (isEnabled) doFetch();

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
    return () => {
      cancelled = true;
      window.removeEventListener("cache-invalidated", onInvalidated);
    };
  });

  return { data, error, loading, refetch };
}
