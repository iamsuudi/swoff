import { useState, useEffect, useCallback } from "react";
import { handleUpdateApproved } from "../sw/injector";

export function useSWUpdate() {
  const [state, setState] = useState(() => ({
    updateStatus: "idle" as "idle" | "available" | "downloading" | "ready",
    currentVersion: typeof window !== "undefined" ? (window.currentSWVersion as string | undefined) || null : null,
    availableVersion: null as string | null,
    progress: 0 as number,
    forceUpdate: false,
    error: null as string | null,
  }));

  useEffect(() => {
    if (sessionStorage.getItem("sw-dismissed-update") === "true") return;

    const onAvailable = (e: WindowEventMap["sw-update-available"]) =>
      setState((s) => ({
        ...s,
        updateStatus: "available",
        availableVersion: e.detail.version,
        forceUpdate: window.swUpdateRequired || false,
      }));
    const onProgress = (e: WindowEventMap["sw-progress"]) =>
      setState((s) => ({ ...s, updateStatus: "downloading", progress: e.detail.percent }));
    const onReady = () =>
      setState((s) => ({ ...s, updateStatus: "idle", progress: 0 }));
    const onError = () =>
      setState((s) => ({ ...s, error: "SW registration failed" }));

    window.addEventListener("sw-update-available", onAvailable);
    window.addEventListener("sw-progress", onProgress);
    window.addEventListener("sw-ready", onReady);
    window.addEventListener("sw-error", onError);
    return () => {
      window.removeEventListener("sw-update-available", onAvailable);
      window.removeEventListener("sw-progress", onProgress);
      window.removeEventListener("sw-ready", onReady);
      window.removeEventListener("sw-error", onError);
    };
  }, []);

  const acceptUpdate = useCallback(async () => {
    if (!state.availableVersion) return;
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
    progress: 0 as number,
  });

  useEffect(() => {
    const onProgress = (e: WindowEventMap["sw-progress"]) =>
      setState({ status: "installing", progress: e.detail.percent });
    const onReady = () => setState({ status: "idle", progress: 0 });

    window.addEventListener("sw-progress", onProgress);
    window.addEventListener("sw-ready", onReady);
    return () => {
      window.removeEventListener("sw-progress", onProgress);
      window.removeEventListener("sw-ready", onReady);
    };
  }, []);

  return state;
}
