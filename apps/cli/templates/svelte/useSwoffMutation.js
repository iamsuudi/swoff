import { writable } from "svelte/store";
import { fetchWithCache } from "../fetch/core.js";
import {
  trackMutation,
  resolveMutation,
  rejectMutation,
} from "../mutation/state.js";

export function useSwoffMutation(url, options = {}) {
  const lastResult = writable(null);
  const isLoading = writable(false);
  const mutationId = writable(null);

  const inFlightKeys = new Set();

  async function mutate(body, callbacks) {
    const key = options.mutationKey;
    if (key && inFlightKeys.has(key)) return { status: "skipped" };
    if (key) inFlightKeys.add(key);

    let retriesLeft =
      options.retry === true
        ? Infinity
        : typeof options.retry === "number"
          ? options.retry
          : 0;

    const mid = "mut-" + crypto.randomUUID();
    mutationId.set(mid);
    trackMutation(mid, "pending");
    isLoading.set(true);

    options.onMutate?.();

    const attempt = async () => {
      try {
        const {
          mutationKey,
          onMutate,
          onSuccess,
          onError,
          onSettled,
          retry,
          ...fetchOnlyOptions
        } = options;
        const fetchOptions = { ...fetchOnlyOptions, body };
        const { response, queued } = await fetchWithCache(url, fetchOptions);
        if (queued) {
          resolveMutation(mid, null);
          isLoading.set(false);
          const r = { status: "queued" };
          lastResult.set(r);
          options.onSettled?.();
          callbacks?.onSettled?.();
          if (key) inFlightKeys.delete(key);
          return r;
        }
        const data = await response.json();
        resolveMutation(mid, data);
        isLoading.set(false);
        const r = { status: "success", data };
        lastResult.set(r);
        options.onSuccess?.(data);
        callbacks?.onSuccess?.(data);
        options.onSettled?.();
        callbacks?.onSettled?.();
        if (key) inFlightKeys.delete(key);
        return r;
      } catch (err) {
        if (retriesLeft > 0) {
          retriesLeft--;
          await new Promise((r) => setTimeout(r, 1000));
          return attempt();
        }
        const error = err instanceof Error ? err : new Error(String(err));
        rejectMutation(mid, error);
        isLoading.set(false);
        const r = { status: "error", error };
        lastResult.set(r);
        options.onError?.(error);
        callbacks?.onError?.(error);
        options.onSettled?.();
        callbacks?.onSettled?.();
        if (key) inFlightKeys.delete(key);
        return r;
      }
    };

    return attempt();
  }

  function reset() {
    lastResult.set(null);
    isLoading.set(false);
  }

  return {
    mutate,
    isLoading,
    isIdle: lastResult,
    isQueued: lastResult,
    isSuccess: lastResult,
    isError: lastResult,
    data: lastResult,
    error: lastResult,
    lastResult,
    reset,
    mutationId,
  };
}
