import { useState, useCallback, useRef } from "react";
import { fetchWithCache } from "../fetch/core.js";
import {
  trackMutation,
  resolveMutation,
  rejectMutation,
} from "../offline/state.js";

/**
 * Hook for mutations (POST, PUT, PATCH, DELETE) with auto-invalidation, offline queuing,
 * optimistic updates, and dual-level callbacks.
 *
 * Usage:
 *   const { mutate, isLoading, error, data } = useMutation("/api/todos", {
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
 *   const { mutate } = useMutation("/api/todos", {
 *     method: "POST",
 *     onMutate: () => { /* set optimistic state */ },
 *     onError: () => { /* rollback */ },
 *   });
 */
export function useMutation(url, options = {}) {
  const [state, setState] = useState({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const [mutationId, setMutationId] = useState(null);
  const optionsRef = useRef(options);
  const urlRef = useRef(url);
  const inFlightKeys = useRef(new Set());

  urlRef.current = url;

  const mutate = useCallback(async (body, callbacks) => {
    const key = optionsRef.current.mutationKey;
    if (key && inFlightKeys.current.has(key)) return null;
    if (key) inFlightKeys.current.add(key);

    let retriesLeft = optionsRef.current.retry === true
      ? Infinity
      : (optionsRef.current.retry ?? 0);

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
        const fetchOptions = { ...optionsRef.current, body };
        const { response, queued } = await fetchWithCache(urlRef.current, fetchOptions);
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
