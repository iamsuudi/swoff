import { useState, useEffect, useCallback } from "react";
import { handleUpdateApproved } from "../sw/injector.js";

export function useSWUpdate() {
  const [state, setState] = useState(() => ({
    status: "idle",
    progress: 0,
    error: null,
    forceUpdate: false,
  }));

  useEffect(() => {
    if (sessionStorage.getItem("sw-dismissed-update") === "true") return;

    const onAvailable = () =>
      setState((s) => ({
        status: s.status === "installing" ? "ready" : "available",
        progress: s.progress,
        error: null,
        forceUpdate: window.swUpdateRequired || false,
      }));

    const onProgress = (e) =>
      setState((s) => ({
        ...s,
        status: s.status === "idle" ? "installing" : s.status,
        progress: e.detail.percent,
      }));

    const onReady = () =>
      setState((s) => ({
        ...s,
        status: s.status === "installing" ? "idle" : s.status,
        progress: 0,
      }));

    const onError = () =>
      setState({ status: "idle", progress: 0, error: "SW registration failed", forceUpdate: false });

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
    const version = window.swAvailableVersion;
    if (!version) return;
    await handleUpdateApproved(version);
  }, []);

  const dismissUpdate = useCallback(() => {
    sessionStorage.setItem("sw-dismissed-update", "true");
    setState({ status: "idle", progress: 0, error: null, forceUpdate: false });
  }, []);

  return { ...state, acceptUpdate, dismissUpdate };
}
