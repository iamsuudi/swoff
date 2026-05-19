/**
 * Swoff Service Worker Template
 * 
 * This template is processed by the config generator to create
 * a fully functional service worker based on user configuration.
 */

let CACHE_NAME = "";
let ASSETS_TO_CACHE = [];

// [[INSTALL_HANDLER]]
// [[ACTIVATE_HANDLER]]
// [[FETCH_HANDLER]]

// Utility functions for service worker operations
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
      await cache.delete(request);
    }
  },
  network: {
    async fetch(request, options = {}) {
      try {
        return await fetch(request, options);
      } catch (error) {
        throw new Error(\`Network request failed: \${error.message}\`);
      }
    }
  }
};

if (typeof self !== 'undefined') {
  self.SWOFF = SWOFF;
}