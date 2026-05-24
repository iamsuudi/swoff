import type { SwoffConfig } from "../shared/config-types.js";

export interface GuideContext {
  config: SwoffConfig;
  frameworkName: string;
  lang: string;
}

export function generateGuide(ctx: GuideContext): string[] {
  const lines: string[] = [];
  const { config, frameworkName, lang } = ctx;
  const ext = lang === "ts" ? "ts" : "js";

  const isReact = frameworkName === "react";

  lines.push("");
  lines.push("  ── Getting Started ──");
  lines.push("  App entry point (" + (isReact ? "main.tsx" : (lang === "ts" ? "main.ts" : "main.js")) + "):");
  lines.push(`    import { initServiceWorker } from "./swoff/client-injector.${ext}";`);
  lines.push("    initServiceWorker();");
  lines.push("");
  lines.push("  Fetch wrapper for API calls:");
  lines.push(`    import { fetchWithCache } from "./swoff/fetch-wrapper.${ext}";`);
  lines.push(`    const data = await fetchWithCache("/api/data").then(r => r.json());`);
  lines.push("");
  lines.push("  Add to package.json build script:");
  lines.push('    "build": "your-build && node swoff/sw/generator.js"');

  if (config.features.pwa.enabled) {
    lines.push("");
    lines.push("  ── PWA ──");
    lines.push(`  Import in app entry:`);
    lines.push(`    import { setupPwaInstall, isInstallable, promptInstall } from "./swoff/pwa/install.${ext}";`);
    lines.push("    setupPwaInstall();");
    lines.push("");
    lines.push(`  Link manifest in index.html <head>:`);
    lines.push(`    <link rel="manifest" href="/manifest.json">`);
    if (isReact) {
      lines.push("");
      lines.push("  React hooks generated in swoff/hooks/usePWAUpdate.tsx:");
      lines.push(`    import { usePWAUpdate, useSWProgress } from "../swoff/hooks/usePWAUpdate.${ext}x";`);
      lines.push("");
      lines.push("    function App() {");
      lines.push("      const { updateStatus, progress, acceptUpdate, dismissUpdate } = usePWAUpdate();");
      lines.push("      const { status } = useSWProgress();");
      lines.push("      if (updateStatus === 'available') return <UpdatePrompt ... />;");
      lines.push("      if (status === 'installing') return <SWProgressBar progress={progress} />;");
      lines.push("      return <MainApp />;");
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
      lines.push("  React hook generated in swoff/hooks/useMutationQueue.tsx:");
      lines.push(`    import { useMutationQueue } from "../swoff/hooks/useMutationQueue.${ext}x";`);
      lines.push("");
      lines.push("    function SyncStatus() {");
      lines.push("      const { pending, lastSync } = useMutationQueue();");
      lines.push("      if (pending > 0) return <span>{pending} pending</span>;");
      lines.push("      if (lastSync?.failed) return <span>{lastSync.failed} failed</span>;");
      lines.push("      return null;");
      lines.push("    }");
    }
  }

  if (config.features.auth.enabled) {
    const authType = config.features.auth.type;
    lines.push("");
    lines.push(`  ── Auth (${authType}) ──`);
    lines.push(`  After login (store token):`);
    lines.push(`    import { setAuth } from "./swoff/auth/store.${ext}";`);
    lines.push('    await setAuth({ token, expiresAt: Date.now() + 3600000 });');
    lines.push("");
    lines.push(`  For authenticated API calls:`);
    lines.push(`    import { authenticatedFetch } from "./swoff/auth/fetch.${ext}";`);
    lines.push(`    const data = await authenticatedFetch("/api/me").then(r => r.json());`);
    if (config.features.auth.type === "bearer") {
      lines.push("");
      lines.push("  ⚠️ Bearer token is memory-only, it is never persisted to IndexedDB.");
      lines.push("    Page refresh requires re-login. Use refreshPath to extend sessions.");
    }
    if (isReact) {
      lines.push("");
      lines.push("  React hook generated in swoff/hooks/useAuth.tsx:");
      lines.push(`    import { useAuth } from "../swoff/hooks/useAuth.${ext}x";`);
      lines.push("");
      lines.push("    function Profile() {");
      lines.push("      const { authenticated, user, online } = useAuth();");
      lines.push("      if (!authenticated) return <LoginPage />;");
      lines.push("      return <div>Welcome {user?.name} {!online && '(offline)'}</div>;");
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

  if (!config.features.tagInvalidation && config.features.crossTabSync) {
    lines.push("");
    lines.push("  ⚠️ crossTabSync requires tagInvalidation to be enabled.");
    lines.push('     Run: npx @swoff/cli add tag-invalidation');
  }

  return lines;
}
