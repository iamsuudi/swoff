/**
 * Generates the SW install event handler (asset pre-caching with progress).
 */

export function generateInstallHandler(): string {
  return `
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      let downloaded = 0;
      for (const asset of ASSETS_TO_CACHE) {
        try {
          const request = new Request(asset.url, asset.options);
          await cache.add(request);
          downloaded++;
          const percent = Math.round((downloaded / ASSETS_TO_CACHE.length) * 100);
          const clients = await self.clients.matchAll({ includeUncontrolled: true });
          clients.forEach((client) => {
            client.postMessage({
              type: "SW_PROGRESS",
              percent,
              downloaded,
              total: ASSETS_TO_CACHE.length,
            });
          });
        } catch (err) {
          console.error(\`Failed to cache \${asset.url}:\`, err);
        }
      }
      if (AUTO_SKIP_WAITING) self.skipWaiting();
    })(),
  );
});`;
}
