/**
 * Generates the SW file header comment with config metadata.
 */

import type { SwoffConfig } from "../../shared/config-types.js";

export function generateConfigHeader(config: SwoffConfig, resolvedVersion: string): string {
  return `/**
 * Swoff Service Worker - Auto-Generated
 * Generated from swoff.config.json
 * DO NOT EDIT MANUALLY
 * Version: ${resolvedVersion}
 * Features: version.enabled=${config.features.serviceWorker.version.enabled}, mutationQueue=${config.features.mutationQueue.enabled}, backgroundSync=${config.features.backgroundSync}, tagInvalidation=${typeof config.features.tagInvalidation === "boolean" ? config.features.tagInvalidation : config.features.tagInvalidation.enabled}
 * Default Strategy: ${config.features.serviceWorker.defaultStrategy}
 * See: https://swoff.netlify.app/docs
 */`;
}
