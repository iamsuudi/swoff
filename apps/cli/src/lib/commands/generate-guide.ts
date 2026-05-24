import type { SwoffConfig } from "../shared/config-types.js";
import type { ProjectInfo } from "../utils/detect-framework.js";

export interface GuideContext {
  config: SwoffConfig;
  projectInfo: ProjectInfo;
  lang: string;
}

export function generateGuide(ctx: GuideContext): string[] {
  const lines: string[] = [];
  const { config, projectInfo, lang } = ctx;
  const ext = lang === "ts" ? "ts" : "js";

  const isReact = projectInfo.framework === "react" && projectInfo.bundler === "vite";

  lines.push("");
  lines.push("  ── Getting Started ──");
  lines.push("  App entry point (" + (isReact ? "main.tsx" : (lang === "ts" ? "main.ts" : "main.js")) + "):");
  lines.push(`    import { initServiceWorker } from "./swoff/sw-injector.${ext}";`);
  lines.push("    initServiceWorker();");
  lines.push("");
  lines.push("  Fetch wrapper for API calls:");
  lines.push(`    import { fetchWithCache } from "./swoff/fetch-wrapper.${ext}";`);
  lines.push(`    const data = await fetchWithCache("/api/data").then(r => r.json());`);
  lines.push("");
  lines.push("  Add to package.json build script:");
  lines.push('    "build": "your-build && node swoff/sw-generator.js"');

  if (config.features.pwa.enabled) {
    lines.push("");
    lines.push("  ── PWA ──");
    lines.push(`  Import in app entry:`);
    lines.push(`    import { initPWAInstall } from "./swoff/pwa-install.${ext}";`);
    lines.push("    initPWAInstall();");
    lines.push("");
    lines.push(`  Link manifest in index.html <head>:`);
    lines.push(`    <link rel="manifest" href="/manifest.json">`);
    if (isReact) {
      lines.push("");
      lines.push("  React hooks (create in hooks/usePWAUpdate.tsx):");
      lines.push(`    import { useState, useEffect, useCallback } from "react";`);
      lines.push("");
      lines.push("    export function usePWAUpdate() {");
      lines.push("      const [state, setState] = useState({");
      lines.push('        updateStatus: "idle",');
      lines.push("        currentVersion: null,");
      lines.push("        availableVersion: null,");
      lines.push("        progress: 0,");
      lines.push("        forceUpdate: false,");
      lines.push("        error: null,");
      lines.push("      });");
      lines.push("");
      lines.push("      useEffect(() => {");
      lines.push("        setState((s) => ({ ...s, currentVersion: window.currentSWVersion || null }));");
      lines.push("");
      lines.push("        const onAvailable = (e) => setState((s) => ({");
      lines.push("          ...s,");
      lines.push('          updateStatus: "available",');
      lines.push("          availableVersion: e.detail.version,");
      lines.push("          forceUpdate: window.swUpdateRequired || false,");
      lines.push("        }));");
      lines.push("        const onProgress = (e) => setState((s) => ({");
      lines.push("          ...s,");
      lines.push('          updateStatus: "downloading",');
      lines.push("          progress: e.detail.percent,");
      lines.push("        }));");
      lines.push('        const onReady = () => setState((s) => ({ ...s, updateStatus: "idle", progress: 0 }));');
      lines.push('        const onError = () => setState((s) => ({ ...s, error: "SW registration failed" }));');
      lines.push("");
      lines.push('        window.addEventListener("sw-update-available", onAvailable);');
      lines.push('        window.addEventListener("sw-progress", onProgress);');
      lines.push('        window.addEventListener("sw-ready", onReady);');
      lines.push('        window.addEventListener("sw-error", onError);');
      lines.push("        return () => {");
      lines.push('          window.removeEventListener("sw-update-available", onAvailable);');
      lines.push('          window.removeEventListener("sw-progress", onProgress);');
      lines.push('          window.removeEventListener("sw-ready", onReady);');
      lines.push('          window.removeEventListener("sw-error", onError);');
      lines.push("        };");
      lines.push("      }, []);");
      lines.push("");
      lines.push("      const acceptUpdate = useCallback(async () => {");
      lines.push("        if (!state.availableVersion) return;");
      lines.push(`        const { handleUpdateApproved } = await import("./swoff/sw-injector.${ext}");`);
      lines.push("        await handleUpdateApproved(state.availableVersion);");
      lines.push("      }, [state.availableVersion]);");
      lines.push("");
      lines.push("      const dismissUpdate = useCallback(() => {");
      lines.push('        sessionStorage.setItem("sw-dismissed-update", "true");');
      lines.push('        setState((s) => ({ ...s, updateStatus: "idle" }));');
      lines.push("      }, []);");
      lines.push("");
      lines.push("      return { ...state, acceptUpdate, dismissUpdate };");
      lines.push("    }");
      lines.push("");
      lines.push("    export function useSWProgress() {");
      lines.push("      const [state, setState] = useState({");
      lines.push('        status: "idle",');
      lines.push("        progress: 0,");
      lines.push("      });");
      lines.push("");
      lines.push("      useEffect(() => {");
      lines.push("        const onProgress = (e) => setState({");
      lines.push('          status: "installing",');
      lines.push("          progress: e.detail.percent,");
      lines.push("        });");
      lines.push('        const onReady = () => setState({ status: "idle", progress: 0 });');
      lines.push("");
      lines.push('        window.addEventListener("sw-progress", onProgress);');
      lines.push('        window.addEventListener("sw-ready", onReady);');
      lines.push("        return () => {");
      lines.push('          window.removeEventListener("sw-progress", onProgress);');
      lines.push('          window.removeEventListener("sw-ready", onReady);');
      lines.push("        };");
      lines.push("      }, []);");
      lines.push("      return state;");
      lines.push("    }");
    }
  }

  if (config.features.mutationQueue) {
    lines.push("");
    lines.push("  ── Mutation Queue ──");
    lines.push(`  Import in mutation handlers:`);
    lines.push(`    import { queueMutation, processMutationQueue, getPendingCount } from "./swoff/mutation-queue.${ext}";`);
    if (isReact) {
      lines.push("");
      lines.push("  React hook (create in hooks/useMutationQueue.tsx):");
      lines.push(`    import { useState, useEffect } from "react";`);
      lines.push(`    import { getPendingCount } from "../swoff/mutation-queue.${ext}";`);
      lines.push("");
      lines.push("    export function useMutationQueue() {");
      lines.push("      const [state, setState] = useState({ pending: 0, lastSync: null });");
      lines.push("");
      lines.push("      useEffect(() => {");
      lines.push("        getPendingCount().then((count) => setState((s) => ({ ...s, pending: count })));");
      lines.push("");
      lines.push("        const onSync = (e) => setState({");
      lines.push("          pending: 0,");
      lines.push("          lastSync: { succeeded: e.detail.succeeded, failed: e.detail.failed },");
      lines.push("        });");
      lines.push("        const onChange = async () => setState((s) => ({ ...s, pending: await getPendingCount() }));");
      lines.push("");
      lines.push('        window.addEventListener("mutation-sync-complete", onSync);');
      lines.push('        window.addEventListener("mutation-queue-changed", onChange);');
      lines.push("        return () => {");
      lines.push('          window.removeEventListener("mutation-sync-complete", onSync);');
      lines.push('          window.removeEventListener("mutation-queue-changed", onChange);');
      lines.push("        };");
      lines.push("      }, []);");
      lines.push("      return state;");
      lines.push("    }");
    }
  }

  if (config.features.auth.enabled) {
    const authType = config.features.auth.type;
    lines.push("");
    lines.push(`  ── Auth (${authType}) ──`);
    lines.push(`  After login (store token):`);
    lines.push(`    import { setAuth } from "./swoff/auth-store.${ext}";`);
    lines.push('    await setAuth({ token, expiresAt: Date.now() + 3600000 });');
    lines.push("");
    lines.push(`  For authenticated API calls:`);
    lines.push(`    import { authenticatedFetch } from "./swoff/auth-fetch.${ext}";`);
    lines.push(`    const data = await authenticatedFetch("/api/me").then(r => r.json());`);
    if (config.features.auth.type === "bearer") {
      lines.push("");
      lines.push("  ⚠️ Bearer token is memory-only, it is never persisted to IndexedDB.");
      lines.push("    Page refresh requires re-login. Use refreshPath to extend sessions.");
    }
    if (isReact) {
      lines.push("");
      lines.push("  React hook (create in hooks/useAuth.tsx):");
      lines.push(`    import { useState, useEffect } from "react";`);
      lines.push(`    import { getAuthState } from "../swoff/auth-state.${ext}";`);
      lines.push("");
      lines.push("    export function useAuth() {");
      lines.push("      const [state, setState] = useState({");
      lines.push("        authenticated: false,");
      lines.push("        user: null,");
      lines.push("        online: navigator.onLine,");
      lines.push("      });");
      lines.push("");
      lines.push("      useEffect(() => {");
      lines.push("        getAuthState().then(setState);");
      lines.push("");
      lines.push("        const onOnline = () => setState((s) => ({ ...s, online: true }));");
      lines.push("        const onOffline = () => setState((s) => ({ ...s, online: false }));");
      lines.push("        const onAuthChange = () => getAuthState().then(setState);");
      lines.push("");
      lines.push('        window.addEventListener("online", onOnline);');
      lines.push('        window.addEventListener("offline", onOffline);');
      lines.push('        window.addEventListener("sw-auth-state-change", onAuthChange);');
      lines.push("");
      lines.push("        return () => {");
      lines.push('          window.removeEventListener("online", onOnline);');
      lines.push('          window.removeEventListener("offline", onOffline);');
      lines.push('          window.removeEventListener("sw-auth-state-change", onAuthChange);');
      lines.push("        };");
      lines.push("      }, []);");
      lines.push("      return state;");
      lines.push("    }");
      if (config.features.mutationQueue) {
        lines.push("");
        lines.push("  ⚠️ After auth re-login, drain queued mutations:");
        lines.push(`    import { flushMutations } from "../swoff/mutation-queue.${ext}";`);
        lines.push("    await setAuth({ token });");
        lines.push("    await flushMutations();");
      }
    }
  }

  if (config.features.backgroundSync) {
    lines.push("");
    lines.push("  ── Background Sync ──");
    lines.push("  ⚠️ Chrome/Edge only (not supported in Firefox or Safari).");
    if (!config.features.mutationQueue) {
      lines.push("  ❌ Requires mutationQueue to be enabled.");
      lines.push('     Run: npx @swoff/cli add mutation-queue');
    }
  }

  if (config.features.tagInvalidation) {
    lines.push("");
    lines.push("  ── Tag Invalidation ──");
    lines.push(`  Generate tags and invalidate after mutations:`);
    lines.push(`    import { generateTags, invalidateUrl } from "./swoff/invalidation-tags.${ext}";`);
    lines.push("");
    lines.push(`    // Tag reads`);
    lines.push(`    const data = await fetchWithCache("/api/todos", { tags: generateTags("/api/todos") });`);
    lines.push("");
    lines.push(`    // Invalidate after mutations`);
    lines.push('    await invalidateUrl("/api/todos/42");');
  }

  if (config.features.indexeddb.enabled) {
    lines.push("");
    lines.push("  ── IndexedDB ──");
    lines.push(`  Call on app startup:`);
    lines.push(`    import { migrateDB } from "./swoff/indexeddb.${ext}";`);
    lines.push("    await migrateDB();");
    lines.push("");
    lines.push(`  Edit swoff/indexeddb.${ext} to define your schema and stores.`);
  }

  if (!config.features.tagInvalidation && config.features.crossTabSync) {
    lines.push("");
    lines.push("  ⚠️ crossTabSync requires tagInvalidation to be enabled.");
    lines.push('     Run: npx @swoff/cli add tag-invalidation');
  }

  return lines;
}
