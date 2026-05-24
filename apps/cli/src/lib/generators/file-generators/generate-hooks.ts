import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { GeneratorContext } from "./context.js";

export function generateHooks(ctx: GeneratorContext): void {
  const { config, swoffDir, ext, frameworkName } = ctx;
  if (frameworkName !== "react") return;

  const hooksDir = join(swoffDir, "hooks");
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  if (config.features.pwa.enabled) {
    writePWAHooks(hooksDir, ext);
  }
  if (config.features.auth.enabled) {
    writeAuthHook(hooksDir, ext);
  }
  if (config.features.mutationQueue) {
    writeMutationQueueHook(hooksDir, ext);
  }
}

function writePWAHooks(dir: string, ext: string) {
  writeFileSync(
    join(dir, `usePWAUpdate.${ext}x`),
    `import { useState, useEffect, useCallback } from "react";

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
    const { handleUpdateApproved } = await import("../sw-injector.${ext}");
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
`,
  );

  // useSWProgress is included in the same file
}

function writeAuthHook(dir: string, ext: string) {
  writeFileSync(
    join(dir, `useAuth.${ext}x`),
    `import { useState, useEffect } from "react";
import { getAuthState } from "../auth-state.${ext}";

export function useAuth() {
  const [state, setState] = useState({
    authenticated: false,
    user: null as Record<string, unknown> | null,
    online: navigator.onLine,
  });

  useEffect(() => {
    getAuthState().then(setState);

    const onOnline = () => setState((s) => ({ ...s, online: true }));
    const onOffline = () => setState((s) => ({ ...s, online: false }));
    const onAuthChange = () => getAuthState().then(setState);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("sw-auth-state-change", onAuthChange);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("sw-auth-state-change", onAuthChange);
    };
  }, []);

  return state;
}
`,
  );
}

function writeMutationQueueHook(dir: string, ext: string) {
  writeFileSync(
    join(dir, `useMutationQueue.${ext}x`),
    `import { useState, useEffect } from "react";
import { getPendingCount } from "../mutation-queue.${ext}";

export function useMutationQueue() {
  const [state, setState] = useState<{
    pending: number;
    lastSync: { succeeded: number; failed: number } | null;
  }>({ pending: 0, lastSync: null });

  useEffect(() => {
    getPendingCount().then((count: number) => setState((s) => ({ ...s, pending: count })));

    const onSync = (e: CustomEvent) => setState({
      pending: 0,
      lastSync: { succeeded: e.detail.succeeded, failed: e.detail.failed },
    });
    const onChange = async () => setState((s) => ({ ...s, pending: await getPendingCount() }));

    window.addEventListener("mutation-sync-complete", onSync as EventListener);
    window.addEventListener("mutation-queue-changed", onChange);
    return () => {
      window.removeEventListener("mutation-sync-complete", onSync as EventListener);
      window.removeEventListener("mutation-queue-changed", onChange);
    };
  }, []);

  return state;
}
`,
  );
}
