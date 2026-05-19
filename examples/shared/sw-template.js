/**
 * Swoff Service Worker Template
 * 
 * This template is processed by the config generator to create
 * a fully functional service worker based on user configuration.
 * 
 * Placeholders:
 * • [[CACHE_NAME]] - Replaced with cache name including version
 * • [[ASSETS_LIST]] - Replaced with array of assets to cache
 * • [[INSTALL_HANDLER]] - Replaced with install event handler
 * • [[ACTIVATE_HANDLER]] - Replaced with activate event handler
 * • [[FETCH_HANDLER]] - Replaced with fetch event handler with strategies
 */

let CACHE_NAME = "";
let ASSETS_TO_CACHE = [];

// [[INSTALL_HANDLER]]
// [[ACTIVATE_HANDLER]]
// [[FETCH_HANDLER]]

// Utility functions for service worker operations
const SWOFF = {
  // Cache management utilities
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
    },
    
    async keys() {
      const cache = await caches.open(CACHE_NAME);
      return cache.keys();
    }
  },
  
  // Network utilities
  network: {
    async fetch(request, options = {}) {
      try {
        return await fetch(request, options);
      } catch (error) {
        throw new Error(`Network request failed: ${error.message}`);
      }
    }
  },
  
  // Notification utilities
  notify: {
    showUpdate() {
      if ('Notification' in window) {
        new Notification('Update Available', {
          body: 'A new version of the app is available. Click to update.',
          icon: '/icons/icon-192.png'
        });
      }
    },
    
    showOffline() {
      if ('Notification' in window) {
        new Notification('Offline Mode', {
          body: 'You are currently offline. Some features may be limited.',
          icon: '/icons/icon-192.png'
        });
      }
    }
  }
};

// Export utility functions for use in custom code
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SWOFF;
} else if (typeof self !== 'undefined') {
  self.SWOFF = SWOFF;
}
