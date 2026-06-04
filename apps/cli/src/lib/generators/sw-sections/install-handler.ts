/**
 * Generates the SW install event handler (asset pre-caching with progress).
 * Also exports a reusable precacheAssets() function used by both install and
 * the RESET_CACHE message handler.
 */

export function generateInstallHandler(): string {
  return `
async function precacheAssets() {
  const cache = await caches.open(CACHE_NAME);
  let downloaded = 0;
  let attempted = 0;
  for (const asset of ASSETS_TO_CACHE) {
    attempted++;
    try {
      const request = new Request(asset.url, asset.options);
      await cache.add(request);
      downloaded++;
    } catch (err) {
      console.error(\`Failed to cache \${asset.url}:\`, err);
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach((client) => {
        client.postMessage({
          type: "SW_NOTIFICATION",
          level: "warn",
          code: "PRECACHE_FAILED",
          message: \`Failed to precache \${asset.url}\`,
        });
      });
    }
    const percent = Math.round((attempted / ASSETS_TO_CACHE.length) * 100);
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((client) => {
      client.postMessage({
        type: "SW_PROGRESS",
        percent,
        downloaded,
        total: ASSETS_TO_CACHE.length,
      });
    });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await precacheAssets();
      if (AUTO_SKIP_WAITING) self.skipWaiting();
    })(),
  );
});`;
}
