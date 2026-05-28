/**
 * Generates the SW message event handler (SKIP_WAITING, INVALIDATE_TAG, CLEAR_RUNTIME_CACHE).
 */

export function generateMessageHandler(tagInvalidation: boolean, authEnabled: boolean): string {
  let code = `
self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }`;

  if (tagInvalidation) {
    code += `
  if (event.data.type === "INVALIDATE_TAG" && event.data.tag) {
    event.waitUntil(invalidateByTag(event.data.tag));
  }`;
  }

  if (authEnabled) {
    code += `
  if (event.data.type === "CLEAR_RUNTIME_CACHE") {
    event.waitUntil(
      caches.delete(CACHE_NAME_RUNTIME).then(() => {
        return caches.open(CACHE_NAME_RUNTIME);
      }),
    );
  }`;
  }

  code += `
  if (event.data.type === "ONLINE") {
    event.waitUntil(handleOnline());
  }

});`;
  return code;
}
