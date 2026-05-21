/**
 * Generates the SW message event handler (SKIP_WAITING, INVALIDATE_TAG).
 */

export function generateMessageHandler(tagInvalidation: boolean): string {
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

  code += `
});`;
  return code;
}
