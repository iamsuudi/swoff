import type { SwoffConfig } from "../../shared/config-types.js";
import { isVersionEnabled, buildFallbackList, scanPrecacheAssets, generateCacheNameFromHash } from "../sw-build-utils.js";
import { getDefaultTemplate } from "./default-template.js";
import { generateConfigHeader } from "./config-header.js";
import { applySwSections, shouldIncludeBackgroundSync, generateBackgroundSyncCode } from "./shared.js";

export function assembleSW(config: SwoffConfig, version: string, projectRoot?: string, debug?: boolean): string {
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
    sw = applySwSections(sw, config, true, debug);
    sw = sw.replace("// [[ASSETS_LIST]]", `ASSETS_TO_CACHE = ${JSON.stringify(formattedAssets, null, 2)}`);
    sw = sw.replace("// [[AUTO_SKIP_WAITING]]", `const AUTO_SKIP_WAITING = ${serviceWorker.autoActivate};`);
    sw = `${generateConfigHeader(config, version)}\n\n${sw}`;
  } else {
    const sentinel = "SW_CACHE_SENTINEL";
    sw = sw.replace("// [[CACHE_NAME]]", `CACHE_NAME = '${sentinel}'`);
    sw = applySwSections(sw, config, true, debug);
    sw = sw.replace("// [[ASSETS_LIST]]", `ASSETS_TO_CACHE = ${JSON.stringify(formattedAssets, null, 2)}`);
    sw = sw.replace("// [[AUTO_SKIP_WAITING]]", `const AUTO_SKIP_WAITING = ${serviceWorker.autoActivate};`);
    const cacheName = generateCacheNameFromHash();
    sw = sw.replace(sentinel, cacheName);
    sw = `${generateConfigHeader(config, version)}\n\n${sw}`;
  }

  if (shouldIncludeBackgroundSync(config)) {
    sw += generateBackgroundSyncCode(config);
  }

  return sw;
}
