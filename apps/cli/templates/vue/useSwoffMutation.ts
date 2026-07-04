import { ref } from "vue";
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

/**
 * Composable for mutations (POST, PUT, PATCH, DELETE) with auto-invalidation, offline queuing,
 * optimistic updates, and dual-level callbacks.
 *
 * Usage:
 *   const { mutate, isLoading, error, data } = useSwoffMutation("/api/todos", {
 *     method: "POST",
 *     onSuccess: (data) => navigate(`/item/${data.id}`),
 *   });
 *
 *   // Check result status after mutate:
 *   const result = await mutate(body);
 *   if (result.status === "success") navigate(`/item/${result.data.id}`);
 */
export function useSwoffMutation<TData = unknown>(
  url: string,
  options: UseMutationOptions<TData> = {},
) {
  const lastResult = ref<MutateResult<TData> | null>(null);
  const isLoading = ref(false);
  const mutationId = ref<string | null>(null);

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
    mutationId.value = mid;
    trackMutation(mid, "pending");
    isLoading.value = true;

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
          isLoading.value = false;
          const r: MutateResult<TData> = { status: "queued" };
          lastResult.value = r;
          options.onSettled?.();
          callbacks?.onSettled?.();
          if (key) inFlightKeys.delete(key);
          return r;
        }
        const data: TData = await response.json();
        resolveMutation(mid, data);
        isLoading.value = false;
        const r: MutateResult<TData> = { status: "success", data };
        lastResult.value = r;
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
        isLoading.value = false;
        const r: MutateResult<TData> = { status: "error", error };
        lastResult.value = r;
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
    lastResult.value = null;
    isLoading.value = false;
  }

  return {
    mutate,
    isLoading,
    isIdle: lastResult.value === null,
    isQueued: lastResult.value?.status === "queued",
    isSuccess: lastResult.value?.status === "success",
    isError: lastResult.value?.status === "error",
    data: lastResult.value?.status === "success" ? (lastResult.value.data ?? null) : null,
    error: lastResult.value?.status === "error" ? (lastResult.value.error ?? null) : null,
    lastResult,
    reset,
    mutationId,
  };
}
