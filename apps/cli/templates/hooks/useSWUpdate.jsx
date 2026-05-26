import { useState, useEffect, useCallback } from "react";
import { handleUpdateApproved } from "../sw/injector.js";

export function useSWUpdate() {
  const [state, setState] = useState({
    updateStatus: "idle",
    currentVersion: window.currentSWVersion || null,
    availableVersion: null,
    progress: 0,
    forceUpdate: false,
    error: null,
  });

  useEffect(() => {
    if (sessionStorage.getItem("sw-dismissed-update") === "true") return;

    const onAvailable = (e) =>
      setState((s) => ({
        ...s,
        updateStatus: "available",
        availableVersion: e.detail.version,
        forceUpdate: window.swUpdateRequired || false,
      }));
    const onProgress = (e) =>
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
    status: "idle",
    progress: 0,
  });

  useEffect(() => {
    const onProgress = (e) =>
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
