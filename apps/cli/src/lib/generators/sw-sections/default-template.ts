/**
 * Default SW template with placeholder markers.
 * Placeholders are replaced during generation with feature-specific code.
 */

export function getDefaultTemplate(): string {
  return `let CACHE_NAME = "";
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
      const cacheKey = typeof key === "string" ? key : new URL(key.url).pathname;
      return cache.match(cacheKey);
    },
    async put(request, response) {
      const cache = await caches.open(CACHE_NAME);
      const cacheKey = typeof request === "string" ? request : new URL(request.url).pathname;
      await cache.put(cacheKey, response);
    },
    async delete(request) {
      const cache = await caches.open(CACHE_NAME);
      const cacheKey = typeof request === "string" ? request : new URL(request.url).pathname;
      return cache.delete(cacheKey);
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
}`;
}
