export function generateMessageHandler(tagInvalidation: boolean, debounceMs: number = 0): string {
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
  }
  if (event.data.type === "FOCUS") {
    if (typeof handleRefetch === "function") handleRefetch("refetchOnFocus");
  }
  if (event.data.type === "ONLINE") {
    if (typeof handleRefetch === "function") handleRefetch("refetchOnReconnect");
  }
  if (event.data.type === "OFFLINE") {
    // Client went offline — the SW already serves from cache transparently.
    // No action needed; reactive refetches will resume on next ONLINE signal.
  }
  if (event.data.type === "RESET_CACHE") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await precacheAssets();
        await resetPrecacheCheckpoint();
        const port = event.ports?.[0];
        port?.postMessage({ type: "RESET_CACHE_COMPLETE" });
      })(),
    );
    startBackgroundPrecache().catch(function(err) {
      console.error("Background precache error:", err);
    });
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
    if (event.ports?.[0]) {
      event.ports[0].postMessage({ type: "URLS_FOR_TAG", urls });
    }
  }
  if (event.data.type === "GET_TAGS_FOR_URL" && event.data.url) {
    const tags = getTagsForUrl(event.data.url);
    if (event.ports?.[0]) {
      event.ports[0].postMessage({ type: "TAGS_FOR_URL", tags });
    }
  }
  if (event.data.type === "INVALIDATE_MATCHING" && event.data.glob) {
    event.waitUntil(invalidateMatching(event.data.glob));
  }`;
  }

  code += `
  if (event.data.type === "AUTH_CLEARED") {
    event.waitUntil(broadcastToClients("AUTH_CLEARED"));
  }
});`;
  return code;
}
