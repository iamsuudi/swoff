/**
 * Assembles the complete service worker string from config and version.
 * Calls individual section generators and performs placeholder replacement.
 */

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
import { generateSwPushHandlers } from "../file-generators/sw-push.js";
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
  const refetchBatchSize = serviceWorker.refetchBatchSize ?? 5;
  const refetchBatchDelayMs = serviceWorker.refetchBatchDelayMs ?? 1000;
  sw = sw.replace("// [[FETCH_HANDLER]]", generateFetchHandler({ ...serviceWorker, refetchBatchSize, refetchBatchDelayMs }, features.tagInvalidation));
  sw = sw.replace("// [[ACTIVATE_HANDLER]]", generateActivateHandler(serviceWorker.clearRuntimeOnUpdate, serviceWorker.navigationPreload));
  sw = sw.replace("// [[INSTALL_HANDLER]]", generateInstallHandler());
  sw = sw.replace("// [[MESSAGE_HANDLER]]", generateMessageHandler(features.tagInvalidation, features.auth.enabled));
  sw = features.tagInvalidation
    ? sw.replace("// [[TAG_MANAGEMENT]]", generateTagManagement())
    : sw.replace("// [[TAG_MANAGEMENT]]", "");

  sw = features.pushNotifications?.enabled
    ? sw.replace("// [[PUSH_HANDLERS]]", generateSwPushHandlers())
    : sw.replace("// [[PUSH_HANDLERS]]", "");

  sw = features.serverPush?.enabled
    ? sw.replace("// [[SERVER_PUSH_HANDLER]]", generateServerPushHandler(features.serverPush.type, features.serverPush.endpoint, features.serverPush.reconnectDelayMs))
    : sw.replace("// [[SERVER_PUSH_HANDLER]]", "");

  return sw;
}

export function assembleSW(config: SwoffConfig, version: string, projectRoot?: string): string {
  const { serviceWorker } = config.features;
  const { features } = config;
  const outputDir = config.build?.outputDir || "dist";
  const swFilename = config.build?.swFilename || "sw";
  const versionEnabled = serviceWorker.version.enabled;

  const fallback: string[] = ["/index.html"];
  if (features.pwa.enabled) fallback.push("/manifest.json");

  const scanned: string[] = [];
  if (projectRoot) {
    const distPath = join(projectRoot, outputDir);
    const allAssets = collectAssets(distPath, distPath);
    const swFile = versionEnabled ? `${swFilename}-v${version}.js` : `${swFilename}.js`;
    for (const a of allAssets) {
      if (a !== `/${swFile}` && a !== "/version.json") scanned.push(a);
    }
  }

  const assetsToCache = scanned.length > 0 ? [...new Set([...fallback, ...scanned])] : fallback;
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
    const authType = features.auth.enabled ? features.auth.type : undefined;
    const mq = features.mutationQueue;
    sw += `\n\n${generateBackgroundSyncHandler(authType, mq.batchSize, mq.batchDelayMs, mq.maxRetries, mq.retryBackoffMs)}`;
  }

  return sw;
}
