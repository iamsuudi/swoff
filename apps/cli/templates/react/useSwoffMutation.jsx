import { useState, useCallback, useRef } from "react";
import { fetchWithCache } from "../fetch/core.js";
import {
  trackMutation,
  resolveMutation,
  rejectMutation,
} from "../mutation/state.js";

/**
 * Hook for mutations (POST, PUT, PATCH, DELETE) with auto-invalidation, offline queuing,
 * optimistic updates, and dual-level callbacks.
 *
 * Usage:
 *   const { mutate, isLoading, error, data } = useSwoffMutation("/api/todos", {
 *     method: "POST",
 *     onSuccess: (data) => navigate(`/item/${data.id}`),
 *   });
 *
 *   // Called multiple times — all share one loading/error state:
 *   await mutate({ title: "hello" });
 *   await mutate({ title: "world" }, {
 *     onSuccess: (data) => console.log(data),
 *   });
 *
 *   // Optimistic update with rollback:
 *   const { mutate } = useSwoffMutation("/api/todos", {
 *     method: "POST",
 *     onMutate: () => { /* set optimistic state *\\/ },
 *     onError: () => { /* rollback *\\/ },
 *   });
 *
 *   // Check result status after mutate:
 *   const result = await mutate(body);
 *   if (result.status === "success") navigate(`/item/${result.data.id}`);
 *   if (result.status === "queued") navigate("/items");
 *   if (result.status === "error") setError(result.error.message);
 */
export function useSwoffMutation(url, options = {}) {
  const [lastResult, setLastResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mutationId, setMutationId] = useState(null);
  const optionsRef = useRef(options);
  const urlRef = useRef(url);
  const inFlightKeys = useRef(new Set());

  urlRef.current = url;

  const mutate = useCallback(async (body, callbacks) => {
    const key = optionsRef.current.mutationKey;
    if (key && inFlightKeys.current.has(key)) return { status: "skipped" };
    if (key) inFlightKeys.current.add(key);

    let retriesLeft =
      optionsRef.current.retry === true
        ? Infinity
        : typeof optionsRef.current.retry === "number"
          ? optionsRef.current.retry
          : 0;

    const mid = "mut-" + crypto.randomUUID();
    setMutationId(mid);
    trackMutation(mid, "pending");
    setIsLoading(true);

    optionsRef.current.onMutate?.();

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
        } = optionsRef.current;
        const fetchOptions = { ...fetchOnlyOptions, body };
        const { response, queued } = await fetchWithCache(
          urlRef.current,
          fetchOptions,
        );
        if (queued) {
          resolveMutation(mid, null);
          setIsLoading(false);
          const r = { status: "queued" };
          setLastResult(r);
          optionsRef.current.onSettled?.();
          callbacks?.onSettled?.();
          if (key) inFlightKeys.current.delete(key);
          return r;
        }
        const data = await response.json();
        resolveMutation(mid, data);
        setIsLoading(false);
        const r = { status: "success", data };
        setLastResult(r);
        optionsRef.current.onSuccess?.(data);
        callbacks?.onSuccess?.(data);
        optionsRef.current.onSettled?.();
        callbacks?.onSettled?.();
        if (key) inFlightKeys.current.delete(key);
        return r;
      } catch (err) {
        if (retriesLeft > 0) {
          retriesLeft--;
          await new Promise((r) => setTimeout(r, 1000));
          return attempt();
        }
        const error = err instanceof Error ? err : new Error(String(err));
        rejectMutation(mid, error);
        setIsLoading(false);
        const r = { status: "error", error };
        setLastResult(r);
        optionsRef.current.onError?.(error);
        callbacks?.onError?.(error);
        optionsRef.current.onSettled?.();
        callbacks?.onSettled?.();
        if (key) inFlightKeys.current.delete(key);
        return r;
      }
    };

    return attempt();
  }, []);

  const reset = useCallback(() => {
    setLastResult(null);
    setIsLoading(false);
  }, []);

  return {
    mutate,
    isLoading,
    isIdle: lastResult === null,
    isQueued: lastResult?.status === "queued",
    isSuccess: lastResult?.status === "success",
    isError: lastResult?.status === "error",
    data: lastResult?.status === "success" ? (lastResult.data ?? null) : null,
    error: lastResult?.status === "error" ? (lastResult.error ?? null) : null,
    lastResult,
    reset,
    mutationId,
  };
}
