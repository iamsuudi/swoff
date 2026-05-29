/**
 * Generates the SW message event handler.
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
  }
  if (event.data.type === "GET_URLS_FOR_TAG" && event.data.tag) {
    const urls = getUrlsForTag(event.data.tag);
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: "URLS_FOR_TAG", urls });
    }
  }
  if (event.data.type === "GET_TAGS_FOR_URL" && event.data.url) {
    const tags = getTagsForUrl(event.data.url);
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: "TAGS_FOR_URL", tags });
    }
  }
  if (event.data.type === "INVALIDATE_MATCHING" && event.data.glob) {
    event.waitUntil(invalidateMatching(event.data.glob));
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
  if (event.data.type === "FOCUS") {
    event.waitUntil(handleOnFocus());
  }

});`;
  return code;
}
