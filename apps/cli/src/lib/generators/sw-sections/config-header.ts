/**
 * Generates the SW file header comment with config metadata.
 */

import type { SwoffConfig } from "../../shared/config-types.js";

export function generateConfigHeader(config: SwoffConfig): string {
  return `/**
 * Swoff Service Worker - Auto-Generated
 * Generated from swoff.config.json
 * DO NOT EDIT MANUALLY
 * Version: ${config.version}
 * Features: versionedSw=${config.features.versionedSw}, offlineReads=${config.features.offlineReads}, mutationQueue=${config.features.mutationQueue}, backgroundSync=${config.features.backgroundSync}, tagInvalidation=${config.features.tagInvalidation}
 * Default Strategy: ${config.serviceWorker.defaultStrategy}
 * See: https://swoff.netlify.app/docs
 */`;
}
