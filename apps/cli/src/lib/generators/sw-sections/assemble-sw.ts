import type { SwoffConfig } from "../../shared/config-types.js";
import { buildFallbackList, scanPrecacheAssets } from "../sw-build-utils.js";
import { getDefaultTemplate } from "./default-template.js";
import { generateConfigHeader } from "./config-header.js";
import { applySwSections, shouldIncludeBackgroundSync, generateBackgroundSyncCode } from "./shared.js";

export function assembleSW(config: SwoffConfig, projectRoot?: string, debug?: boolean): string {
  const { caching, serviceWorker } = config.features;

  const swFile = "swoff.sw.js";

  // Precaching only applies when the caching feature is on.
  const concurrency = caching.precache?.concurrency ?? 1;
  const delayMs = caching.precache?.delayMs ?? 0;

  const fallback = buildFallbackList(config);
  const scanned = projectRoot ? scanPrecacheAssets(config, projectRoot, swFile) : [];
  const assetsToCache = caching.enabled ? [...new Set([...fallback, ...scanned])] : [];

  let sw = getDefaultTemplate();

  sw = applySwSections(sw, config, true, debug);

  sw = sw.replace(/let ASSETS_TO_CACHE = \[\];?/, () => `let ASSETS_TO_CACHE = ${JSON.stringify(assetsToCache, null, 2)};`);
  sw = sw.replace(/let PRECACHE_CONCURRENCY = \d+;?/, () => `let PRECACHE_CONCURRENCY = ${concurrency};`);
  sw = sw.replace(/let PRECACHE_DELAY_MS = \d+;?/, () => `let PRECACHE_DELAY_MS = ${delayMs};`);
  sw = sw.replace(/let AUTO_SKIP_WAITING = (?:true|false);?/, () => `let AUTO_SKIP_WAITING = ${serviceWorker.autoActivate};`);
  sw = `${generateConfigHeader(config)}\n\n${sw}`;

  if (caching.enabled && shouldIncludeBackgroundSync(config)) {
    sw += generateBackgroundSyncCode(config);
  }

  return sw;
}
