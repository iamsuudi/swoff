export function generateMessageHandler(tagInvalidation: boolean, authEnabled: boolean, debounceMs: number = 0): string {
  const debouncePrologue = tagInvalidation && debounceMs > 0
    ? `
const INVALIDATION_DEBOUNCE_MS = ${debounceMs};
let _invTagBatch = [];
let _invTimer = null;
let _invWaiters = [];

function processInvalidationBatch() {
  const tags = [...new Set(_invTagBatch)];
  _invTagBatch = [];
  _invTimer = null;
  const waiters = _invWaiters;
  _invWaiters = [];
  Promise.all(tags.map(function(t) { return invalidateByTag(t); }))
    .then(function() { waiters.forEach(function(r) { r(); }); })
    .catch(function() { waiters.forEach(function(r) { r(); }); });
}

function debouncedInvalidate(tag) {
  _invTagBatch.push(tag);
  if (_invTimer) clearTimeout(_invTimer);
  _invTimer = setTimeout(processInvalidationBatch, INVALIDATION_DEBOUNCE_MS);
  return new Promise(function(resolve) {
    _invWaiters.push(resolve);
  });
}
`
    : "";

  let code = `${debouncePrologue}
self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }`;

  if (tagInvalidation) {
    const invalidateCall = debounceMs > 0
      ? "event.waitUntil(debouncedInvalidate(event.data.tag))"
      : "event.waitUntil(invalidateByTag(event.data.tag))";

    code += `
  if (event.data.type === "INVALIDATE_TAG" && event.data.tag) {
    ${invalidateCall};
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
