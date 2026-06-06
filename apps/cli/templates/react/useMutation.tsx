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

export type MutateResult<T> =
  | { status: "skipped" }
  | { status: "queued" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

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
export function useMutation<TData = unknown>(
  url: string,
  options: UseMutationOptions<TData> = {},
) {
  const [lastResult, setLastResult] = useState<MutateResult<TData> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mutationId, setMutationId] = useState<string | null>(null);
  const optionsRef = useRef(options);
  const urlRef = useRef(url);
  const inFlightKeys = useRef(new Set<string>());

  urlRef.current = url;

  const mutate = useCallback(
    async (
      body?: unknown,
      callbacks?: MutateCallbacks<TData>,
    ): Promise<MutateResult<TData>> => {
      const key = optionsRef.current.mutationKey;
      if (key && inFlightKeys.current.has(key))
        return { status: "skipped" };
      if (key) inFlightKeys.current.add(key);

      let retriesLeft: number = optionsRef.current.retry === true
        ? Infinity
        : typeof optionsRef.current.retry === "number"
          ? optionsRef.current.retry
          : 0;

      const mid = "mut-" + crypto.randomUUID();
      setMutationId(mid);
      trackMutation(mid, "pending");
      setIsLoading(true);

      optionsRef.current.onMutate?.();

      const attempt = async (): Promise<MutateResult<TData>> => {
        try {
          const { mutationKey, onMutate, onSuccess, onError, onSettled, retry, ...fetchOnlyOptions } = optionsRef.current;
          const fetchOptions = { ...fetchOnlyOptions, body };
          const { response, queued } = await fetchWithCache<TData>(urlRef.current, fetchOptions as FetchWithCacheOptions);
          if (queued) {
            resolveMutation(mid, null);
            setIsLoading(false);
            const r: MutateResult<TData> = { status: "queued" };
            setLastResult(r);
            optionsRef.current.onSettled?.();
            callbacks?.onSettled?.();
            if (key) inFlightKeys.current.delete(key);
            return r;
          }
          const data: TData = await response.json();
          resolveMutation(mid, data);
          setIsLoading(false);
          const r: MutateResult<TData> = { status: "success", data };
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
          const r: MutateResult<TData> = { status: "error", error };
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
    },
    [],
  );

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
    data: lastResult?.status === "success" ? lastResult.data ?? null : null,
    error: lastResult?.status === "error" ? lastResult.error ?? null : null,
    lastResult,
    reset,
    mutationId,
  };
}
