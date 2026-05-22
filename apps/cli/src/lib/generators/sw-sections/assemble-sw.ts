/**
 * Assembles the complete service worker string from config and version.
 * Calls individual section generators and performs placeholder replacement.
 */

import type { SwoffConfig } from "../../shared/config-types.js";
import { getDefaultTemplate } from "./default-template.js";
import { generateConfigHeader } from "./config-header.js";
import { generateInstallHandler } from "./install-handler.js";
import { generateActivateHandler } from "./activate-handler.js";
import { generateMessageHandler } from "./message-handler.js";
import { generateFetchHandler } from "./fetch-handler.js";
import { generateTagManagement } from "./tag-management.js";
import { generateBackgroundSyncHandler } from "./background-sync-handler.js";

export function assembleSW(config: SwoffConfig, version: string): string {
  const { serviceWorker, features } = config;

  const baseAssets = ["/", "/index.html"];
  const pwaAssets = features.pwa ? ["/manifest.json"] : [];
  const assetsToCache = [...baseAssets, ...pwaAssets];

  let sw = getDefaultTemplate();

  sw = sw.replace("// [[CACHE_NAME]]", `CACHE_NAME = 'sw-v${version}'`);
  sw = sw.replace("// [[ASSETS_LIST]]", `ASSETS_TO_CACHE = ${JSON.stringify(assetsToCache.map((url) => ({ url, options: {} })), null, 2)}`);
  sw = sw.replace("// [[AUTO_SKIP_WAITING]]", `const AUTO_SKIP_WAITING = ${config.serviceWorker.autoActivate};`);

  sw = sw.replace("// [[FETCH_HANDLER]]", generateFetchHandler(serviceWorker, features.tagInvalidation));
  sw = sw.replace("// [[ACTIVATE_HANDLER]]", generateActivateHandler());
  sw = sw.replace("// [[INSTALL_HANDLER]]", generateInstallHandler());
  sw = sw.replace("// [[MESSAGE_HANDLER]]", generateMessageHandler(features.tagInvalidation));

  if (features.tagInvalidation) {
    sw = sw.replace("// [[TAG_MANAGEMENT]]", generateTagManagement());
  } else {
    sw = sw.replace("// [[TAG_MANAGEMENT]]", "");
  }

  sw = `${generateConfigHeader(config, version)}\n\n${sw}`;

  if (features.backgroundSync) {
    sw += `\n\n${generateBackgroundSyncHandler()}`;
  }

  return sw;
}
