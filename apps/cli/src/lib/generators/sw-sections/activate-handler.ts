export function generateActivateHandler(clearRuntimeOnUpdate: boolean, navigationPreload?: boolean): string {
  const cacheCleanup = clearRuntimeOnUpdate
    ? `keys.filter((key) => key !== CACHE_NAME)`
    : `keys.filter((key) => key !== CACHE_NAME && key !== CACHE_NAME_RUNTIME)`;

  const navPreloadCode = navigationPreload ? `
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }` : "";

  return `
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();${navPreloadCode}
      const keys = await caches.keys();
      await Promise.all(
        ${cacheCleanup}.map((key) => caches.delete(key))
      );
    })()
  );
});`;
}
