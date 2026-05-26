export function generateActivateHandler(clearRuntimeOnUpdate?: boolean): string {
  const cacheCleanup = clearRuntimeOnUpdate
    ? `keys.filter((key) => key !== CACHE_NAME)`
    : `keys.filter((key) => key !== CACHE_NAME && key !== CACHE_NAME_RUNTIME)`;

  return `
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const keys = await caches.keys();
      await Promise.all(
        ${cacheCleanup}.map((key) => caches.delete(key))
      );
    })()
  );
});`;
}
