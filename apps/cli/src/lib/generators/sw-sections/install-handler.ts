/**
 * Generates the SW install event handler (asset pre-caching with progress).
 * Also exports a reusable precacheAssets() function used by both install and
 * the RESET_CACHE message handler.
 */

export function generateInstallHandler(): string {
  return `
async function precacheAssets() {
  const cache = await caches.open("precache");
  const stale = await cache.keys();
  await Promise.all(stale.map(function(req) { return cache.delete(req); }));
  let downloaded = 0;
  let attempted = 0;
  const total = PRECACHE_FALLBACKS.length;
  if (total === 0) return;
  const allClients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const url of PRECACHE_FALLBACKS) {
    attempted++;
    try {
      const request = new Request(url);
      await cache.add(request);
      downloaded++;
    } catch (err) {
      console.error(\`Failed to cache \${url}:\`, err);
      allClients.forEach((client) => {
        client.postMessage({
          type: "SW_NOTIFICATION",
          level: "warn",
          code: "PRECACHE_FAILED",
          message: \`Failed to precache \${url}\`,
        });
      });
    }
    const percent = Math.round((attempted / total) * 100);
    allClients.forEach((client) => {
      client.postMessage({
        type: "SW_PROGRESS",
        percent,
        downloaded,
        total,
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
