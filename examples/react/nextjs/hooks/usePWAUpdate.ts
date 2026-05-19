"use client";

import { useState, useEffect, useCallback } from "react";

export function usePWAUpdate() {
  const [updateStatus, setUpdateStatus] = useState<"idle" | "available" | "downloading">("idle");
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = (e: CustomEvent) => {
      const newVersion = e.detail.version;
      const current = localStorage.getItem("swRegisteredVersion");
      setCurrentVersion(current);
      setAvailableVersion(newVersion);
      setUpdateStatus("available");
      const minSupported = window.swMinSupportedVersion || "0.0.0";
      setForceUpdate(!!(current && current < minSupported));
    };

    const handleProgress = (e: CustomEvent) => {
      if (updateStatus === "downloading") setProgress(e.detail.percent);
    };

    const handleReady = () => {
      if (updateStatus === "downloading") {
        setUpdateStatus("idle");
        setProgress(0);
      }
    };

    window.addEventListener("sw-update-available", handleUpdateAvailable as any);
    window.addEventListener("sw-progress", handleProgress as any);
    window.addEventListener("sw-ready", handleReady);
    window.addEventListener("sw-version-detected", () => {
      setCurrentVersion(window.currentSWVersion || null);
    });

    return () => {
      window.removeEventListener("sw-update-available", handleUpdateAvailable as any);
      window.removeEventListener("sw-progress", handleProgress as any);
      window.removeEventListener("sw-ready", handleReady);
    };
  }, [updateStatus]);

  const acceptUpdate = useCallback(async () => {
    setUpdateStatus("downloading");
    const { registerServiceWorker } = await import("@/swoff/sw-injector");
    if (availableVersion) await registerServiceWorker(availableVersion);
  }, [availableVersion]);

  const dismissUpdate = useCallback(() => {
    if (!forceUpdate) {
      setUpdateStatus("idle");
      sessionStorage.setItem("sw-dismissed-update", "true");
    }
  }, [forceUpdate]);

  const checkForUpdates = useCallback(async () => {
    const { checkForUpdate } = await import("@/swoff/sw-injector");
    await checkForUpdate();
  }, []);

  return { currentVersion, availableVersion, updateStatus, progress, forceUpdate, dismissUpdate, acceptUpdate, checkForUpdates };
}
