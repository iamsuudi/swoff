import { readdirSync, existsSync } from "fs";
import { join, relative } from "path";
import { createHash } from "crypto";
import type { SwoffConfig } from "../../shared/config-types.js";
import { getDefaultTemplate } from "./default-template.js";
import { generateConfigHeader } from "./config-header.js";
import { generateInstallHandler } from "./install-handler.js";
import { generateActivateHandler } from "./activate-handler.js";
import { generateMessageHandler } from "./message-handler.js";
import { generateFetchHandler } from "./fetch-handler.js";
import { generateTagManagement } from "./tag-management.js";
import { generateBackgroundSyncHandler } from "./background-sync-handler.js";
import { generateSwPushHandlers } from "./sw-push.js";
import { generateServerPushHandler } from "./server-push-handler.js";

function collectAssets(dir: string, baseDir: string): string[] {
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir, { withFileTypes: true });
  const assets: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      assets.push(...collectAssets(fullPath, baseDir));
    } else {
      assets.push("/" + relative(baseDir, fullPath));
    }
  }
  return assets;
}

function generateCacheNameFromHash(swContent: string): string {
  const hash = createHash("sha256").update(swContent).digest("hex").slice(0, 12);
  return `sw-cache-${hash}`;
}

function applyReplacements(sw: string, config: SwoffConfig, assetsToCache: { url: string; options: Record<string, unknown> }[]): string {
  const { serviceWorker } = config.features;
  const { features } = config;

  sw = sw.replace("// [[ASSETS_LIST]]", `ASSETS_TO_CACHE = ${JSON.stringify(assetsToCache, null, 2)}`);
  sw = sw.replace("// [[AUTO_SKIP_WAITING]]", `const AUTO_SKIP_WAITING = ${serviceWorker.autoActivate};`);

  const { strategy, navigation } = serviceWorker;
  const { refetchQueue } = features;
  sw = sw.replace("// [[FETCH_HANDLER]]", generateFetchHandler({
    strategy,
    navigation,
    refetchQueue,
  }, true, features.mutationQueue.enabled));

  sw = sw.replace("// [[ACTIVATE_HANDLER]]", generateActivateHandler(strategy.clearRuntimeOnUpdate, navigation.preload, strategy.maxRuntimeCacheAge));
  sw = sw.replace("// [[INSTALL_HANDLER]]", generateInstallHandler());
  sw = sw.replace("// [[MESSAGE_HANDLER]]", generateMessageHandler(true, features.tagInvalidation.debounceMs ?? 0));
  sw = sw.replace("// [[TAG_MANAGEMENT]]", generateTagManagement());

  sw = features.pushNotifications?.enabled
    ? sw.replace("// [[PUSH_HANDLERS]]", generateSwPushHandlers())
    : sw.replace("// [[PUSH_HANDLERS]]", "");

  const baseUrl = config.apiBaseUrl || "";
  sw = features.serverPush?.enabled
    ? sw.replace("// [[SERVER_PUSH_HANDLER]]", generateServerPushHandler(features.serverPush.type, baseUrl + features.serverPush.endpoint, features.serverPush.reconnectDelayMs))
    : sw.replace("// [[SERVER_PUSH_HANDLER]]", "");

  return sw;
}

export function assembleSW(config: SwoffConfig, version: string, projectRoot?: string): string {
  const { serviceWorker } = config.features;
  const { features } = config;
  const outputDir = config.build?.outputDir || "dist";
  const swFilename = config.build?.swFilename || "sw";
  const versionEnabled = serviceWorker.version !== "hash";

  const fallback: string[] = ["/index.html"];
  if (features.pwa.enabled) fallback.push("/manifest.json");
  const offlineFallbackPath = config.features.serviceWorker.navigation.offlineFallback;
  if (offlineFallbackPath && !fallback.includes(offlineFallbackPath)) {
    fallback.push(offlineFallbackPath);
  }

  const scanned: string[] = [];
  if (projectRoot) {
    const dirsRaw = config.build?.precacheDirs || {};
    const dirs = Object.keys(dirsRaw).length > 0 ? dirsRaw : { [outputDir]: "/" };
    const swFile = versionEnabled ? `${swFilename}-v${version}.js` : `${swFilename}.js`;
    for (const [dir, prefix] of Object.entries(dirs)) {
      const dirPath = join(projectRoot, dir);
      const normPrefix = prefix.replace(/\/+$/, "");
      for (const a of collectAssets(dirPath, dirPath)) {
        const urlPath = normPrefix + "/" + a.slice(1);
        if (urlPath !== `/${swFile}` && urlPath !== "/version.json") scanned.push(urlPath);
      }
    }
  }

  const assetsToCache = scanned.length > 0 ? [...new Set([...fallback, ...scanned])] : [...fallback];

  // Add precache routes from config (fetched at install time)
  const precacheRoutes = config.features.serviceWorker.navigation.precacheRoutes || [];
  for (const route of precacheRoutes) {
    if (!assetsToCache.includes(route)) {
      assetsToCache.push(route);
    }
  }

  const formattedAssets = assetsToCache.map((url) => ({ url, options: {} }));

  let sw = getDefaultTemplate();

  if (versionEnabled) {
    sw = sw.replace("// [[CACHE_NAME]]", `CACHE_NAME = 'sw-v${version}'`);
    sw = applyReplacements(sw, config, formattedAssets);
    sw = `${generateConfigHeader(config, version)}\n\n${sw}`;
  } else {
    const sentinel = "SW_CACHE_SENTINEL";
    sw = sw.replace("// [[CACHE_NAME]]", `CACHE_NAME = '${sentinel}'`);
    sw = applyReplacements(sw, config, formattedAssets);
    const cacheName = generateCacheNameFromHash(sw);
    sw = sw.replace(sentinel, cacheName);
    sw = `${generateConfigHeader(config, version)}\n\n${sw}`;
  }

  if (features.backgroundSync) {
    if (!features.auth.enabled || features.auth.type === "cookie") {
      const authType = features.auth.enabled ? features.auth.type : undefined;
      const mq = features.mutationQueue;
      sw += `\n\n${generateBackgroundSyncHandler(authType, mq.batchSize, mq.batchDelayMs, mq.maxRetries, mq.retryBackoffMs, true)}`;
    }
  }

  return sw;
}
