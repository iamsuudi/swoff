import { useState, useCallback, useRef } from "react";
import { fetchWithCache } from "../fetch/core.ts";
import {
  trackMutation,
  resolveMutation,
  rejectMutation,
} from "../offline/state.ts";
import type { FetchWithCacheOptions } from "../fetch/core.ts";

export interface MutateCallbacks<TData> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}

export interface UseMutationOptions<TData> extends FetchWithCacheOptions {
  /** Called before the mutation fires. Use for optimistic UI — set local state here, then rollback from onError. */
  onMutate?: () => void;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
  /** Deduplication key — if a mutation with the same key is already in-flight, this one is skipped. */
  mutationKey?: string;
  /** Retry count on failure (default 0). true = Infinity. */
  retry?: number | boolean;
}

/**
 * Hook for mutations (POST, PUT, PATCH, DELETE) with auto-invalidation, offline queuing,
 * optimistic updates, and dual-level callbacks.
 *
 * Usage:
 *   const { mutate, isLoading, error, data } = useMutation<CreateTodoResponse>(
 *     "/api/todos",
 *     { method: "POST", onSuccess: (data) => navigate(`/item/${data.id}`) },
 *   );
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
 *     onMutate: () => { /* set optimistic state *\/ },
 *     onError: () => { /* rollback *\/ },
 *   });
 */
export function useMutation<TData = unknown>(
  url: string,
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
  const urlRef = useRef(url);
  const inFlightKeys = useRef(new Set<string>());

  urlRef.current = url;

  const mutate = useCallback(
    async (
      body?: unknown,
      callbacks?: MutateCallbacks<TData>,
    ): Promise<TData | null> => {
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

      const attempt = async (): Promise<TData | null> => {
        try {
          const fetchOptions = { ...optionsRef.current, body };
          const { response, queued } = await fetchWithCache<TData>(urlRef.current, fetchOptions);
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
