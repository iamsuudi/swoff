import { useEffect, useState, useCallback, useRef } from "react";
import { fetchWithCache } from "../fetch-wrapper.ts";
import {
  trackMutation,
  resolveMutation,
  rejectMutation,
} from "../mutation-state.ts";
import type { FetchWithCacheOptions } from "../fetch-wrapper.ts";

export interface UseMutationOptions<TData> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}

/**
 * Hook for mutations (POST, PUT, PATCH, DELETE) with auto-invalidation, offline queuing,
 * and mutation state tracking.
 *
 * Powered by fetchWithCache which handles:
 *   - Auth headers (bearer/cookie — set `auth: true` for bearer)
 *   - Auto-invalidation of cache entries (by URL or tags)
 *   - Offline queueing (mutations are stored in IndexedDB and replayed when online)
 *   - 401 detection → auto-refresh → retry
 *
 * Usage:
 *   const { mutate, isLoading, error, data } = useMutation({
 *     onSuccess: (data) => console.log("Done", data),
 *     onError: (err) => console.error("Failed", err),
 *   });
 *
 *   // POST with auto-invalidation:
 *   await mutate("/api/todos", {
 *     method: "POST",
 *     body: JSON.stringify({ title: "New task" }),
 *   });
 *
 *   // Mutation with auth (for bearer tokens):
 *   await mutate("/api/profile", {
 *     method: "PUT",
 *     body: JSON.stringify({ name: "New" }),
 *     auth: true,
 *   });
 *
 *   // Skip auto-invalidation:
 *   await mutate("/api/todos", {
 *     method: "POST",
 *     body,
 *     invalidate: false,
 *   });
 *
 *   // Custom invalidation tags:
 *   await mutate("/api/todos", {
 *     method: "POST",
 *     body,
 *     invalidate: ["todos", "projects"],
 *   });
 *
 *   // Offline: mutation is queued and replayed when online
 *   // Disable with: queueOffline: false
 *
 *   // Custom success validation (e.g., API returns 200 with { success: false }):
 *   await mutate("/api/checkout", {
 *     method: "POST",
 *     body,
 *     validateSuccess: (res) => res.ok,
 *   });
 *
 * @param options - Callbacks for mutation lifecycle events.
 * @returns { data, error, isLoading, isError, isSuccess, mutate, reset }
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

  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const mutate = useCallback(
    async (
      url: string,
      fetchOptions: FetchWithCacheOptions = {},
    ): Promise<TData | null> => {
      const mutationId = "mut-" + crypto.randomUUID();
      trackMutation(mutationId, "pending");
      setState({
        data: null,
        error: null,
        isLoading: true,
        isError: false,
        isSuccess: false,
      });

      try {
        const { response, queued } = await fetchWithCache<TData>(url, fetchOptions);
        if (queued) {
          resolveMutation(mutationId, null);
          setState({
            data: null,
            error: null,
            isLoading: false,
            isError: false,
            isSuccess: false,
          });
          optionsRef.current.onSettled?.();
          return null;
        }
        const data: TData = await response.json();
        resolveMutation(mutationId, data);
        setState({
          data,
          error: null,
          isLoading: false,
          isError: false,
          isSuccess: true,
        });
        optionsRef.current.onSuccess?.(data);
        optionsRef.current.onSettled?.();
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        rejectMutation(mutationId, error);
        setState({
          data: null,
          error,
          isLoading: false,
          isError: true,
          isSuccess: false,
        });
        optionsRef.current.onError?.(error);
        optionsRef.current.onSettled?.();
        return null;
      }
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

  return { ...state, mutate, reset };
}
