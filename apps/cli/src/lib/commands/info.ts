/**
 * info command — minimal summary or per-feature detail.
 *
 * Usage:
 *   swoff info           List enabled features and generated files
 *   swoff info <feature> Detailed explanation of a specific feature
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { log } from "../cli/logger.js";
import { loadConfigAsync } from "../config/loader.js";

interface FeatureInfo {
  label: string;
  description: string;
  files: string[];
  functions: string[];
}

const FEATURES: Record<string, FeatureInfo> = {
  "mutation-queue": {
    label: "Mutation Queue",
    description:
      "Queues offline write operations in IndexedDB and replays them when the connection returns. Uses SW_BACKGROUND_SYNC or the online event listener.",
    files: ["mutation-queue.ts", "mutation-reconcile.ts", "store.ts"],
    functions: [
      "queueMutation(mutation) — store a write for later sync",
      "processMutationQueue() — replay all queued writes",
      "flushMutations() — same as processMutationQueue, call after re-login",
      "getPendingCount() — number of mutations waiting to sync",
      "reconcileRecord(storeName, tempId, serverData) — replace temp ID with server ID",
      "reconcileReferences(storeName, oldId, newId) — update FK refs (override for your schema)",
    ],
  },
  "background-sync": {
    label: "Background Sync",
    description:
      "Registers Background Sync API events so mutations are processed even after the tab is closed. Falls back to online event listener in unsupported browsers (Firefox, Safari).",
    files: ["background-sync.ts"],
    functions: [
      "syncWhenPossible(mutation) — queue and register background sync",
      "retrySync() — re-register sync if mutations are still pending",
    ],
  },
  auth: {
    label: "Auth",
    description:
      "Token-based authentication with memory-only tokens, IndexedDB user caching, and auth-aware fetch with automatic 401 handling.",
    files: ["auth/store.ts", "auth/fetch.ts", "auth/user.ts", "auth/state.ts"],
    functions: [
      "setAuth(authData) / getAuth() / clearAuth() — manage auth state",
      "isAuthValid(auth) — check expiry",
      "createAuthFromResponse(response) — extract AuthData from login response (edit this)",
      "authenticatedFetch(input, options) — auth-aware fetch wrapper",
      "ensureValidAuth() — check expiry and refresh token",
      "fetchCurrentUser() / getCachedUser() / cacheUser(user) / clearCachedUser() — user caching",
      "getAuthState() — detect 4-state matrix (online/offline × authenticated/not)",
    ],
  },
  "tag-invalidation": {
    label: "Tag Invalidation",
    description:
      "Generates cache tags from URL paths and invalidates stale cache entries after mutations. Keeps cached data fresh.",
    files: ["invalidation-tags.ts", "cache.ts"],
    functions: [
      "generateTags(url) — extract tags from URL (e.g. /api/todos/42 → ['todos', 'todo:42'])",
      "generateTagsFromMethod(method, url) — method-prefixed tags",
      "invalidateUrl(url) — invalidate all cache entries matching a URL's tags",
      "invalidateByTag(tag) / invalidateByTags(tags) — low-level invalidation",
    ],
  },
  "cross-tab": {
    label: "Cross-tab Sync",
    description:
      "Broadcasts cache invalidation and auth state changes across all open tabs via the service worker.",
    files: ["client-injector.ts (internal handling)"],
    functions: ["No separate imports needed — handled automatically by client-injector.ts"],
  },
  pwa: {
    label: "PWA",
    description:
      "Install prompt handling, manifest generation, and React hooks for update management.",
    files: ["pwa/install.ts", "manifest.json"],
    functions: [
      "setupPwaInstall() — listen for beforeinstallprompt/appinstalled events",
      "isInstallable() — check if install prompt is available",
      "promptInstall() — show native install prompt",
    ],
  },
};

export async function infoCommand(projectRoot: string, feature?: string) {
  if (feature) {
    return showFeatureDetail(feature);
  }

  // Minimal top-level summary
  const { config, configPath } = await loadConfigAsync(projectRoot);

  if (!configPath) {
    log.warn('No swoff.config.json found. Run "swoff init" first.');
    return;
  }

  log.header("Swoff");

  // Show version
  try {
    const pkg = JSON.parse(
      readFileSync(join(projectRoot, "node_modules", "@swoff", "cli", "package.json"), "utf8"),
    );
    log.normal(`Version: ${pkg.version}`);
  } catch {
    // version not available
  }

  // Show enabled features
  const enabled: string[] = [];
  if (config.features.mutationQueue) enabled.push("mutation-queue");
  if (config.features.backgroundSync) enabled.push("background-sync");
  if (config.features.auth.enabled) enabled.push("auth");
  if (config.features.crossTabSync) enabled.push("cross-tab");
  if (config.features.tagInvalidation) enabled.push("tag-invalidation");
  if (config.features.pwa.enabled) enabled.push("pwa");

  if (enabled.length > 0) {
    log.normal(`\nEnabled features: ${enabled.join(", ")}`);
  } else {
    log.normal("\nEnabled features: (none)");
  }

  // Count generated files
  const swoffDir = join(projectRoot, "swoff");
  if (existsSync(swoffDir)) {
    const count = countFilesRecursive(swoffDir);
    log.normal(`Generated files: ${count} in swoff/`);
  }

  log.help("\n  swoff info <feature>  — detailed info for a feature");
  log.help("  Features: mutation-queue, background-sync, auth, tag-invalidation, cross-tab, pwa");
  log.help("  Read swoff/GUIDE.md for the full integration guide");
}

function showFeatureDetail(feature: string) {
  const key = feature.toLowerCase().replace(/[_-]/g, "-").replace(/^-+|-+$/g, "");
  const info = FEATURES[key];

  if (!info) {
    log.error(`Unknown feature: ${feature}`);
    log.info("Available: mutation-queue, background-sync, auth, tag-invalidation, cross-tab, pwa");
    return;
  }

  log.header(info.label);
  log.normal(info.description);

  log.normal("\nGenerated files:");
  info.files.forEach((f) => log.help(`  swoff/${f}`));

  log.normal("\nFunctions:");
  info.functions.forEach((f) => log.help(`  ${f}`));

  log.help("\n  Read swoff/GUIDE.md for code examples and usage details.");
}

function countFilesRecursive(dir: string): number {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countFilesRecursive(full);
    } else {
      count++;
    }
  }
  return count;
}
