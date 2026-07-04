import { writable } from "svelte/store";
import { fetchWithCache } from "../fetch/core";
import {
  trackMutation,
  resolveMutation,
  rejectMutation,
} from "../mutation/state";
import type { FetchWithCacheOptions } from "../fetch/core";

export interface MutateCallbacks<TData> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}

export interface UseMutationOptions<TData> extends FetchWithCacheOptions {
  onMutate?: () => void;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
  mutationKey?: string;
  retry?: number | boolean;
}

export type MutateResult<T> =
  | { status: "skipped" }
  | { status: "queued" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

export function useSwoffMutation<TData = unknown>(
  url: string,
  options: UseMutationOptions<TData> = {},
) {
  const lastResult = writable<MutateResult<TData> | null>(null);
  const isLoading = writable(false);
  const mutationId = writable<string | null>(null);

  const inFlightKeys = new Set<string>();

  async function mutate(
    body?: unknown,
    callbacks?: MutateCallbacks<TData>,
  ): Promise<MutateResult<TData>> {
    const key = options.mutationKey;
    if (key && inFlightKeys.has(key)) return { status: "skipped" };
    if (key) inFlightKeys.add(key);

    let retriesLeft: number =
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

    const attempt = async (): Promise<MutateResult<TData>> => {
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
        const { response, queued } = await fetchWithCache<TData>(
          url,
          fetchOptions as FetchWithCacheOptions,
        );
        if (queued) {
          resolveMutation(mid, null);
          isLoading.set(false);
          const r: MutateResult<TData> = { status: "queued" };
          lastResult.set(r);
          options.onSettled?.();
          callbacks?.onSettled?.();
          if (key) inFlightKeys.delete(key);
          return r;
        }
        const data: TData = await response.json();
        resolveMutation(mid, data);
        isLoading.set(false);
        const r: MutateResult<TData> = { status: "success", data };
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
        const r: MutateResult<TData> = { status: "error", error };
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
