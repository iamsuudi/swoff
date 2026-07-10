/**
 * Generates the SW file header comment with config metadata.
 */

import type { SwoffConfig } from "../../shared/config-types.js";

export function generateConfigHeader(config: SwoffConfig): string {
  return `/**
 * Swoff Service Worker - Auto-Generated
 * Generated from swoff.config.json
 * DO NOT EDIT MANUALLY
 * Features: auth=${config.features.auth.enabled}, authType=${config.features.auth.type}, mutationQueue=${config.features.mutationQueue.enabled}, backgroundSync=${config.features.mutationQueue.backgroundSync}, pwa=${config.features.pwa.enabled}, graphql=${config.features.graphql.enabled}, tagInvalidation=${config.features.tagInvalidation.enabled}, push=${config.features.pushNotifications}, serverPush=${config.features.serverPush?.enabled}
 * Default Strategy: ${config.features.serviceWorker.strategy.default}
 * See: https://swoff.space/docs
 */`;
}
