import { useEffect, useState, useCallback, useRef } from "react";
import { fetchWithCache } from "../fetch-wrapper.js";
import {
  trackMutation,
  resolveMutation,
  rejectMutation,
} from "../mutation-state.js";

export function useMutation(options = {}) {
  const [state, setState] = useState({
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

  const mutate = useCallback(async (url, fetchOptions = {}) => {
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
      const { response } = await fetchWithCache(url, fetchOptions);
      const data = await response.json();
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

  return { ...state, mutate, reset };
}
