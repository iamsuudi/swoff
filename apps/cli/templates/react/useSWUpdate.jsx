import { useState, useEffect } from "react";

export function useSWUpdate() {
  const [state, setState] = useState(() => ({
    status: "idle",
    progress: 0,
    error: null,
  }));

  useEffect(() => {
    const onProgress = (e) =>
      setState((s) => ({ ...s, status: "installing", progress: e.detail.percent }));

    const onReady = () =>
      setState({ status: "idle", progress: 0, error: null });

    const onError = () =>
      setState({ status: "idle", progress: 0, error: "SW registration failed" });

    window.addEventListener("sw-progress", onProgress);
    window.addEventListener("sw-ready", onReady);
    window.addEventListener("sw-error", onError);
    return () => {
      window.removeEventListener("sw-progress", onProgress);
      window.removeEventListener("sw-ready", onReady);
      window.removeEventListener("sw-error", onError);
    };
  }, []);

  return state;
}
