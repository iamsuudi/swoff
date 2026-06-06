import type { SwoffConfig } from "../../shared/config-types.js";
import { isVersionEnabled, buildFallbackList, scanPrecacheAssets, generateCacheNameFromHash } from "../sw-build-utils.js";
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
  const versionEnabled = isVersionEnabled(serviceWorker.version);
  const swFilename = config.build.swFilename;

  const swFile = versionEnabled ? `${swFilename}-v${version}.js` : `${swFilename}.js`;
  const fallback = buildFallbackList(config);
  const scanned = projectRoot ? scanPrecacheAssets(config, projectRoot, swFile) : [];
  const assetsToCache = [...new Set([...fallback, ...scanned])];
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
