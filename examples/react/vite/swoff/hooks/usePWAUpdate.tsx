import { useState, useEffect, useCallback } from "react";

export function usePWAUpdate() {
  const [state, setState] = useState({
    updateStatus: "idle",
    currentVersion: null as string | null,
    availableVersion: null as string | null,
    progress: 0,
    forceUpdate: false,
    error: null as string | null,
  });

  useEffect(() => {
    setState((s) => ({ ...s, currentVersion: (window as any).currentSWVersion || null }));

    const onAvailable = (e: CustomEvent) => setState((s) => ({
      ...s,
      updateStatus: "available" as const,
      availableVersion: e.detail.version,
      forceUpdate: (window as any).swUpdateRequired || false,
    }));
    const onProgress = (e: CustomEvent) => setState((s) => ({
      ...s,
      updateStatus: "downloading" as const,
      progress: e.detail.percent,
    }));
    const onReady = () => setState((s) => ({ ...s, updateStatus: "idle" as const, progress: 0 }));
    const onError = () => setState((s) => ({ ...s, error: "SW registration failed" }));

    window.addEventListener("sw-update-available", onAvailable as EventListener);
    window.addEventListener("sw-progress", onProgress as EventListener);
    window.addEventListener("sw-ready", onReady);
    window.addEventListener("sw-error", onError);
    return () => {
      window.removeEventListener("sw-update-available", onAvailable as EventListener);
      window.removeEventListener("sw-progress", onProgress as EventListener);
      window.removeEventListener("sw-ready", onReady);
      window.removeEventListener("sw-error", onError);
    };
  }, []);

  const acceptUpdate = useCallback(async () => {
    if (!state.availableVersion) return;
    const { handleUpdateApproved } = await import("../client-injector.ts");
    await handleUpdateApproved(state.availableVersion);
  }, [state.availableVersion]);

  const dismissUpdate = useCallback(() => {
    sessionStorage.setItem("sw-dismissed-update", "true");
    setState((s) => ({ ...s, updateStatus: "idle" }));
  }, []);

  return { ...state, acceptUpdate, dismissUpdate };
}

export function useSWProgress() {
  const [state, setState] = useState({
    status: "idle" as "idle" | "installing",
    progress: 0,
  });

  useEffect(() => {
    const onProgress = (e: CustomEvent) => setState({
      status: "installing",
      progress: e.detail.percent,
    });
    const onReady = () => setState({ status: "idle", progress: 0 });

    window.addEventListener("sw-progress", onProgress as EventListener);
    window.addEventListener("sw-ready", onReady);
    return () => {
      window.removeEventListener("sw-progress", onProgress as EventListener);
      window.removeEventListener("sw-ready", onReady);
    };
  }, []);

  return state;
}
