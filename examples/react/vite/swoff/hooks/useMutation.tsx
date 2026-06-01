import { useEffect, useState, useCallback, useRef } from "react";
import { fetchWithCache } from "../fetch-wrapper.ts";
import {
  trackMutation,
  resolveMutation,
  rejectMutation,
} from "../mutation-state.ts";
import type { FetchWithCacheOptions } from "../fetch-wrapper.ts";

export interface MutateOptions extends FetchWithCacheOptions {
  /** Deduplication key — if a mutation with the same key is already in-flight, this one is skipped. */
  mutationKey?: string;
  /** Retry count on failure (default 0). true = Infinity. */
  retry?: number | boolean;
}

export interface UseMutationOptions<TData> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
  /** Called before the mutation fires. Use for optimistic UI — set local state here, then rollback from onError. */
  onMutate?: () => void;
  /** Deduplication key — if a mutation with the same key is already in-flight, this one is skipped. */
  mutationKey?: string;
  /** Retry count on failure (default 0). true = Infinity. */
  retry?: number | boolean;
}

export interface MutateCallbacks<TData> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}

/**
 * Hook for mutations (POST, PUT, PATCH, DELETE) with auto-invalidation, offline queuing,
 * optimistic updates, and dual-level callbacks.
 *
 * Usage:
 *   const { mutate, isLoading, error, reset } = useMutation({
 *     onSuccess: (data) => showToast("Saved!"),
 *     onError: (err) => reportError(err),
 *   });
 *
 *   // Hook-level callbacks fire first, then per-call callbacks:
 *   await mutate("/api/todos", { method: "POST", body }, {
 *     onSuccess: (data) => navigate(`/item/${data.id}`),
 *   });
 *
 *   // Optimistic update with rollback:
 *   const { mutate } = useMutation({
 *     onMutate: () => { /* set optimistic state *\/ },
 *     onError: () => { /* rollback *\/ },
 *   });
 *
 *   // Deduplicate — skip if same mutation is already in flight:
 *   await mutate(url, options, { mutationKey: "save-profile" });
 *
 * @returns { data, error, isLoading, isError, isSuccess, mutate, reset, mutationId }
 */
export function useMutation<TData = unknown>(
  options: UseMutationOptions<TData> = {},
) {
  const [state, setState] = useState<{
    data: TData | null;
    error: Error | null;
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
  }>({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const [mutationId, setMutationId] = useState<string | null>(null);
  const optionsRef = useRef(options);
  const inFlightKeys = useRef(new Set<string>());

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const mutate = useCallback(
    async (
      url: string,
      fetchOptions: MutateOptions = {},
      callbacks?: MutateCallbacks<TData>,
    ): Promise<TData | null> => {
      const key = callbacks?.mutationKey ?? fetchOptions.mutationKey ?? options.mutationKey;
      if (key && inFlightKeys.current.has(key)) return null;
      if (key) inFlightKeys.current.add(key);

      let retriesLeft = options.retry ?? fetchOptions.retry ?? 0;
      if (retriesLeft === true) retriesLeft = Infinity;

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

      let retriesLeft = (options.retry ?? fetchOptions.retry) === true
        ? Infinity
        : (options.retry ?? fetchOptions.retry) ?? 0;

      optionsRef.current.onMutate?.();

      const attempt = async (): Promise<TData | null> => {
        try {
          const { response, queued } = await fetchWithCache<TData>(url, fetchOptions);
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
          const data: TData = await response.json();
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
    },
    [],
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
    });
  }, []);

  return {
    ...state,
    mutate,
    reset,
    mutationId,
  };
}
