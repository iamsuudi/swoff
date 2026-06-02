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
 * Usage — URL at hook level (recommended):
 *   const { mutate, isLoading } = useMutation("/api/notes", {
 *     method: "POST",
 *     auth: true,
 *     onSuccess: (note) => navigate(`/notes/${note.id}`),
 *   });
 *   await mutate(JSON.stringify({ title, description }));
 *
 * Usage — URL per call (for varying endpoints like delete-by-id):
 *   const { mutate } = useMutation({
 *     onSuccess: (data) => showToast("done"),
 *   });
 *   await mutate(`/api/notes/${id}`, { method: "DELETE", auth: true }, {
 *     onSuccess: () => dispatchEvent(...),
 *   });
 *
 * Callbacks fire in order: hook-level onMutate → hook onSuccess/onError → per-call onSuccess/onError → hook onSettled → per-call onSettled
 */
export function useMutation(urlOrOptions, options) {
  const hasHookUrl = typeof urlOrOptions === "string";
  const hookUrl = hasHookUrl ? urlOrOptions : null;
  const hookOptions = hasHookUrl ? (options ?? {}) : (urlOrOptions ?? {});

  const [state, setState] = useState({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const [mutationId, setMutationId] = useState(null);
  const optionsRef = useRef(hookOptions);
  const inFlightKeys = useRef(new Set());

  useEffect(() => {
    optionsRef.current = hookOptions;
  });

  const mutate = useCallback(
    async (arg1, arg2, arg3) => {
      const opts = optionsRef.current;
      const { onSuccess: _onSuccess, onError: _onError, onSettled: _onSettled, onMutate: _onMutate, mutationKey: hookMutationKey, retry: hookRetry, ...hookFetchOpts } = opts;

      let url;
      let fetchOptions;
      let callbacks;

      if (hasHookUrl) {
        url = hookUrl;
        fetchOptions = { ...hookFetchOpts };
        if (arg1 !== undefined) fetchOptions.body = arg1;
        callbacks = arg2;
      } else {
        url = arg1;
        fetchOptions = { ...hookFetchOpts, ...(arg2 || {}) };
        callbacks = arg3;
      }

      const key = callbacks?.mutationKey ?? fetchOptions.mutationKey ?? hookMutationKey;
      if (key && inFlightKeys.current.has(key)) return null;
      if (key) inFlightKeys.current.add(key);

      const retrySetting = callbacks?.retry ?? fetchOptions.retry ?? hookRetry;
      let retriesLeft = retrySetting === true ? Infinity : (typeof retrySetting === "number" ? retrySetting : 0);

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
            opts.onSettled?.();
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

  return { ...state, mutate, reset, mutationId };
}
