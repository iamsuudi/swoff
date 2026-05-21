/**
 * Swoff Service Worker Template
 *
 * This template is processed by the build script to create
 * a fully functional service worker based on user configuration.
 *
 * Placeholders (replaced by sw-generator.js):
 *   // [[CACHE_NAME]]       - Sets CACHE_NAME variable
 *   // [[ASSETS_LIST]]      - Sets ASSETS_TO_CACHE array
 *   // [[INSTALL_HANDLER]]  - Install event listener with progress
 *   // [[ACTIVATE_HANDLER]] - Activate event listener (cache cleanup)
 *   // [[MESSAGE_HANDLER]]  - Message handler (SKIP_WAITING, INVALIDATE_TAG)
 *   // [[FETCH_HANDLER]]    - Fetch event with caching strategies
 *   // [[TAG_MANAGEMENT]]   - Tag-based cache invalidation (IndexedDB)
 */

let CACHE_NAME = "";
let ASSETS_TO_CACHE = [];

// [[CACHE_NAME]]
// [[ASSETS_LIST]]
// [[AUTO_SKIP_WAITING]]
const CACHE_NAME_RUNTIME = "swoff-runtime";

// [[INSTALL_HANDLER]]
// [[ACTIVATE_HANDLER]]
// [[MESSAGE_HANDLER]]
// [[FETCH_HANDLER]]
// [[TAG_MANAGEMENT]]

const SWOFF = {
  cache: {
    async get(key) {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(key);
    },
    async put(request, response) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response);
    },
    async delete(request) {
      const cache = await caches.open(CACHE_NAME);
      return cache.delete(request);
    }
  },
  network: {
    async fetch(request, options = {}) {
      try {
        return await fetch(request, options);
      } catch (error) {
        throw new Error(`Network request failed: ${error.message}`);
      }
    }
  }
};

if (typeof self !== 'undefined') {
  self.SWOFF = SWOFF;
}
