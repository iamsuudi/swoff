/**
 * Generates the SW file header comment with config metadata.
 */

import type { SwoffConfig } from "../../shared/config-types.js";

export function generateConfigHeader(config: SwoffConfig): string {
  return `/**
 * Swoff Service Worker - Auto-Generated
 * Generated from swoff.config.json
 * DO NOT EDIT MANUALLY
 * Features: auth=${config.features.auth.enabled}, authType=${config.features.auth.type}, caching=${config.features.caching.enabled}, mutationQueue=${config.features.caching.mutationQueue.enabled}, backgroundSync=${config.features.caching.mutationQueue.backgroundSync}, pwa=${config.features.pwa.enabled}, graphql=${config.features.caching.graphql.enabled}, tagInvalidation=${config.features.caching.tagInvalidation.enabled}, push=${config.features.pushNotifications}, serverPush=${config.features.caching.serverPush?.enabled}
 * Default Strategy: ${config.features.caching.strategy.default}
 * See: https://swoff.space/docs
 */`;
}
