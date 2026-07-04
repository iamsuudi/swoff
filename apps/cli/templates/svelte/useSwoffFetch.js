import { writable } from "svelte/store";
import { onMount } from "svelte";
import { fetchWithCache } from "../fetch/core.js";
import { generateTags } from "../cache/tags.js";

export function useSwoffFetch(url, options = {}) {
  const {
    select,
    retry: retryOpt,
    placeholderData,
    onSuccess,
    onError,
    ...fetchOptions
  } = options;

  const data = writable(placeholderData ?? null);
  const error = writable(null);
  const loading = writable(url != null && options.enabled !== false);

  const isEnabled = options.enabled !== false && url != null;
  let refetchCount = 0;

  function refetch() {
    refetchCount++;
    doFetch();
  }

  async function doFetch() {
    if (!isEnabled) return;
    const currentFetchId = refetchCount;

    let retriesLeft =
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
        const raw = await response.json();
        const selected = select ? select(raw) : raw;
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

    function onInvalidated(e) {
      const detail = e.detail;
      const tags = detail?.tags;
      if (!tags || !Array.isArray(tags)) return;
      const urlTags = generateTags(url);
      if (tags.some((t) => urlTags.includes(t))) {
        refetch();
      }
    }

    window.addEventListener("cache-invalidated", onInvalidated);
    return () => {
      window.removeEventListener("cache-invalidated", onInvalidated);
    };
  });

  return { data, error, loading, refetch };
}
