/**
 * Generates the SW activate event handler (old cache cleanup).
 */

export function generateActivateHandler(): string {
  return `
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== CACHE_NAME_RUNTIME).map((key) => caches.delete(key))
      )
    )
  );
});`;
}
