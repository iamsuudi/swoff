import { useEffect, useState, useCallback, useRef } from "react";
import { fetchWithCache } from "../fetch-wrapper.js";
import {
  trackMutation,
  resolveMutation,
  rejectMutation,
} from "../mutation-state.js";

/**
 * Hook for mutations with auto-invalidation, offline queuing, optimistic updates,
 * dual-level callbacks, and deduplication.
 *
 * Usage:
 *   const { mutate, isLoading, error, reset, mutationId } = useMutation({
 *     onSuccess: (data) => showToast("Saved!"),
 *     onError: (err) => reportError(err),
 *   });
 *
 *   // Per-call callbacks fire after hook-level callbacks:
 *   await mutate("/api/todos", { method: "POST", body }, {
 *     onSuccess: (data) => navigate(`/item/${data.id}`),
 *   });
 *
 *   // Optimistic update:
 *   const { mutate } = useMutation({
 *     onMutate: () => { /* set optimistic state *\/ },
 *     onError: () => { /* rollback *\/ },
 *   });
 *
 *   // Dedup with key:
 *   await mutate(url, { method: "POST", mutationKey: "save-profile" });
 *
 *   // Retry on failure:
 *   await mutate(url, { method: "POST", retry: 3 });
 */
export function useMutation(options = {}) {
  const [state, setState] = useState({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const [mutationId, setMutationId] = useState(null);
  const optionsRef = useRef(options);
  const inFlightKeys = useRef(new Set());

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const mutate = useCallback(async (url, fetchOptions = {}, callbacks) => {
    const key = callbacks?.mutationKey ?? fetchOptions.mutationKey ?? options.mutationKey;
    if (key && inFlightKeys.current.has(key)) return null;
    if (key) inFlightKeys.current.add(key);

    let retriesLeft = (options.retry ?? fetchOptions.retry) === true
      ? Infinity
      : (options.retry ?? fetchOptions.retry) ?? 0;

    const mid = "mut-" + crypto.randomUUID();
    setMutationId(mid);
    trackMutation(mid, "pending");
    setState({
      data: null,
      error: null,
      isLoading: true,
      isError: false,
      isSuccess: false,
    });

    optionsRef.current.onMutate?.();

    const attempt = async () => {
      try {
        const { response, queued } = await fetchWithCache(url, fetchOptions);
        if (queued) {
          resolveMutation(mid, null);
          setState({
            data: null,
            error: null,
            isLoading: false,
            isError: false,
            isSuccess: false,
          });
          optionsRef.current.onSettled?.();
          callbacks?.onSettled?.();
          if (key) inFlightKeys.current.delete(key);
          return null;
        }
        const data = await response.json();
        resolveMutation(mid, data);
        setState({
          data,
          error: null,
          isLoading: false,
          isError: false,
          isSuccess: true,
        });
        optionsRef.current.onSuccess?.(data);
        callbacks?.onSuccess?.(data);
        optionsRef.current.onSettled?.();
        callbacks?.onSettled?.();
        if (key) inFlightKeys.current.delete(key);
        return data;
      } catch (err) {
        if (retriesLeft > 0) {
          retriesLeft--;
          await new Promise((r) => setTimeout(r, 1000));
          return attempt();
        }
        const error = err instanceof Error ? err : new Error(String(err));
        rejectMutation(mid, error);
        setState({
          data: null,
          error,
          isLoading: false,
          isError: true,
          isSuccess: false,
        });
        optionsRef.current.onError?.(error);
        callbacks?.onError?.(error);
        optionsRef.current.onSettled?.();
        callbacks?.onSettled?.();
        if (key) inFlightKeys.current.delete(key);
        return null;
      }
    };

    return attempt();
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
    });
  }, []);

  return { ...state, mutate, reset, mutationId };
}
