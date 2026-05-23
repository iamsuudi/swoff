/**
 * Assembles the complete service worker string from config and version.
 * Calls individual section generators and performs placeholder replacement.
 */

import { readdirSync, existsSync } from "fs";
import { join, relative } from "path";
import type { SwoffConfig } from "../../shared/config-types.js";
import { getDefaultTemplate } from "./default-template.js";
import { generateConfigHeader } from "./config-header.js";
import { generateInstallHandler } from "./install-handler.js";
import { generateActivateHandler } from "./activate-handler.js";
import { generateMessageHandler } from "./message-handler.js";
import { generateFetchHandler } from "./fetch-handler.js";
import { generateTagManagement } from "./tag-management.js";
import { generateBackgroundSyncHandler } from "./background-sync-handler.js";

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

export function assembleSW(config: SwoffConfig, version: string, projectRoot?: string): string {
  const { serviceWorker, features } = config;
  const outputDir = config.build?.outputDir || "dist";
  const swFilename = config.build?.swFilename || "sw";

  const fallback: string[] = ["/index.html"];
  if (features.pwa.enabled) fallback.push("/manifest.json");

  const scanned: string[] = [];
  if (projectRoot) {
    const distPath = join(projectRoot, outputDir);
    const allAssets = collectAssets(distPath, distPath);
    const swFile = `${swFilename}-v${version}.js`;
    for (const a of allAssets) {
      if (a !== `/${swFile}` && a !== "/version.json") scanned.push(a);
    }
  }

  const assetsToCache = scanned.length > 0 ? [...new Set([...fallback, ...scanned])] : fallback;

  let sw = getDefaultTemplate();

  sw = sw.replace("// [[CACHE_NAME]]", `CACHE_NAME = 'sw-v${version}'`);
  sw = sw.replace("// [[ASSETS_LIST]]", `ASSETS_TO_CACHE = ${JSON.stringify(assetsToCache.map((url) => ({ url, options: {} })), null, 2)}`);
  sw = sw.replace("// [[AUTO_SKIP_WAITING]]", `const AUTO_SKIP_WAITING = ${config.serviceWorker.autoActivate};`);

  sw = sw.replace("// [[FETCH_HANDLER]]", generateFetchHandler(serviceWorker, features.tagInvalidation));
  sw = sw.replace("// [[ACTIVATE_HANDLER]]", generateActivateHandler(serviceWorker.clearRuntimeOnUpdate));
  sw = sw.replace("// [[INSTALL_HANDLER]]", generateInstallHandler());
  sw = sw.replace("// [[MESSAGE_HANDLER]]", generateMessageHandler(features.tagInvalidation, features.auth.enabled));

  if (features.tagInvalidation) {
    sw = sw.replace("// [[TAG_MANAGEMENT]]", generateTagManagement());
  } else {
    sw = sw.replace("// [[TAG_MANAGEMENT]]", "");
  }

  sw = `${generateConfigHeader(config, version)}\n\n${sw}`;

  if (features.backgroundSync) {
    const authType = features.auth.enabled ? features.auth.type : undefined;
    sw += `\n\n${generateBackgroundSyncHandler(authType)}`;
  }

  return sw;
}
