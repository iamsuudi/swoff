import { useEffect, useState, useCallback, useRef } from "react";
import { fetchWithCache } from "../fetch-wrapper.ts";
import {
  trackMutation,
  resolveMutation,
  rejectMutation,
} from "../mutation-state.ts";
import type { FetchWithCacheOptions } from "../fetch-wrapper.ts";

export interface UseMutationOptions<TData> extends FetchWithCacheOptions {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
  onMutate?: () => void;
  mutationKey?: string;
  retry?: number | boolean;
}

export interface MutateOptions extends FetchWithCacheOptions {
  mutationKey?: string;
  retry?: number | boolean;
}

export interface MutateCallbacks<TData> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
  mutationKey?: string;
  retry?: number | boolean;
}

/**
 * Hook for mutations (POST, PUT, PATCH, DELETE) with auto-invalidation, offline queuing,
 * optimistic updates, and dual-level callbacks.
 *
 * Usage — URL at hook level (recommended):
 *   const { mutate, isLoading } = useMutation<Note>("/api/notes", {
 *     method: "POST",
 *     auth: true,
 *     onSuccess: (note) => navigate(`/notes/${note.id}`),
 *   });
 *   await mutate(JSON.stringify({ title, description }));
 *
 * Usage — URL per call (for varying endpoints like delete-by-id):
 *   const { mutate } = useMutation<Note>({
 *     onSuccess: (data) => showToast("done"),
 *   });
 *   await mutate(`/api/notes/${id}`, { method: "DELETE", auth: true }, {
 *     onSuccess: () => dispatchEvent(...),
 *   });
 *
 * Callbacks fire in order: hook-level onMutate → hook onSuccess/onError → per-call onSuccess/onError → hook onSettled → per-call onSettled
 */
export function useMutation<TData = unknown>(
  url: string,
  options?: UseMutationOptions<TData>,
): {
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  mutate: (body?: BodyInit | null, callbacks?: MutateCallbacks<TData>) => Promise<TData | null>;
  reset: () => void;
  mutationId: string | null;
};

export function useMutation<TData = unknown>(
  options?: UseMutationOptions<TData>,
): {
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  mutate: (url: string, fetchOptions?: MutateOptions, callbacks?: MutateCallbacks<TData>) => Promise<TData | null>;
  reset: () => void;
  mutationId: string | null;
};

export function useMutation<TData = unknown>(
  urlOrOptions?: string | UseMutationOptions<TData>,
  options?: UseMutationOptions<TData>,
) {
  const hasHookUrl = typeof urlOrOptions === "string";
  const hookUrl: string | null = hasHookUrl ? urlOrOptions : null;
  const hookOptions: UseMutationOptions<TData> = hasHookUrl
    ? (options ?? {})
    : ((urlOrOptions as UseMutationOptions<TData>) ?? {});

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
  const optionsRef = useRef(hookOptions);
  const inFlightKeys = useRef(new Set<string>());

  useEffect(() => {
    optionsRef.current = hookOptions;
  });

  const mutate = useCallback(
    async (
      arg1?: string | BodyInit | null,
      arg2?: MutateOptions | MutateCallbacks<TData>,
      arg3?: MutateCallbacks<TData>,
    ): Promise<TData | null> => {
      const opts = optionsRef.current;
      const { onSuccess: _onSuccess, onError: _onError, onSettled: _onSettled, onMutate: _onMutate, mutationKey: hookMutationKey, retry: hookRetry, ...hookFetchOpts } = opts;

      let url: string;
      let fetchOptions: MutateOptions;
      let callbacks: MutateCallbacks<TData> | undefined;

      if (hasHookUrl) {
        url = hookUrl!;
        fetchOptions = { ...hookFetchOpts };
        if (arg1 !== undefined) fetchOptions.body = arg1 as BodyInit;
        callbacks = arg2 as MutateCallbacks<TData> | undefined;
      } else {
        url = arg1 as string;
        fetchOptions = { ...hookFetchOpts, ...(arg2 as MutateOptions | undefined) };
        callbacks = arg3 as MutateCallbacks<TData> | undefined;
      }

      const key = callbacks?.mutationKey ?? fetchOptions.mutationKey ?? hookMutationKey;
      if (key && inFlightKeys.current.has(key)) return null;
      if (key) inFlightKeys.current.add(key);

      const retrySetting = callbacks?.retry ?? fetchOptions.retry ?? hookRetry;
      let retriesLeft: number = retrySetting === true ? Infinity : (typeof retrySetting === "number" ? retrySetting : 0);

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

      opts.onMutate?.();

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
            opts.onSettled?.();
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
          opts.onSuccess?.(data);
          callbacks?.onSuccess?.(data);
          opts.onSettled?.();
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
          opts.onError?.(error);
          callbacks?.onError?.(error);
          opts.onSettled?.();
          callbacks?.onSettled?.();
          if (key) inFlightKeys.current.delete(key);
          return null;
        }
      };

      return attempt();
    },
    [hasHookUrl, hookUrl],
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
