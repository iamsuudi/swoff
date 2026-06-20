import type { SwoffConfig } from "../../shared/config-types.js";
import { buildFallbackList, scanPrecacheAssets } from "../sw-build-utils.js";
import { getDefaultTemplate } from "./default-template.js";
import { generateConfigHeader } from "./config-header.js";
import { applySwSections, shouldIncludeBackgroundSync, generateBackgroundSyncCode } from "./shared.js";

export function assembleSW(config: SwoffConfig, projectRoot?: string, debug?: boolean): string {
  const { serviceWorker } = config.features;
  const swFilename = config.build.swFilename;

  const swFile = `${swFilename}.js`;
  const fallback = buildFallbackList(config);
  const scanned = projectRoot ? scanPrecacheAssets(config, projectRoot, swFile) : [];
  const assetsToCache = [...new Set([...fallback, ...scanned])];
  const formattedAssets = assetsToCache.map((url) => ({ url, options: {} }));

  let sw = getDefaultTemplate();

  sw = applySwSections(sw, config, true, debug);

  sw = sw.replace(/let ASSETS_TO_CACHE = \[\]/, () => `let ASSETS_TO_CACHE = ${JSON.stringify(formattedAssets, null, 2)};`);
  sw = sw.replace(/let AUTO_SKIP_WAITING = (?:true|false)/, () => `let AUTO_SKIP_WAITING = ${serviceWorker.autoActivate};`);
  sw += `\nconst CACHE_NAME = "${Date.now()}";\n`;
  sw = `${generateConfigHeader(config)}\n\n${sw}`;

  if (shouldIncludeBackgroundSync(config)) {
    sw += generateBackgroundSyncCode(config);
  }

  return sw;
}
