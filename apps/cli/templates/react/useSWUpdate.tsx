import { useState, useEffect, useCallback } from "react";
import { handleUpdateApproved } from "../sw/injector";

type UpdateStatus = "idle" | "available" | "installing" | "ready";

export function useSWUpdate() {
  const [state, setState] = useState(() => ({
    status: "idle" as UpdateStatus,
    progress: 0,
    error: null as string | null,
    forceUpdate: false,
  }));

  useEffect(() => {
    if (sessionStorage.getItem("sw-dismissed-update") === "true") return;

    const onAvailable = (e: WindowEventMap["sw-update-available"]) =>
      setState((s) => ({
        status: s.status === "installing" ? "ready" : "available",
        progress: s.progress,
        error: null,
        forceUpdate: window.swUpdateRequired || false,
      }));

    const onProgress = (e: WindowEventMap["sw-progress"]) =>
      setState((s) => ({
        ...s,
        status: s.status === "idle" ? "installing" : s.status,
        progress: e.detail.percent,
      }));

    const onReady = () => setState((s) => ({
      ...s,
      status: s.status === "installing" ? "idle" : s.status,
      progress: 0,
    }));

    const onError = () =>
      setState((s) => ({ ...s, status: "idle", error: "SW registration failed" }));

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
    setState((s) => ({ ...s, status: "idle" }));
  }, []);

  return { ...state, acceptUpdate, dismissUpdate };
}
