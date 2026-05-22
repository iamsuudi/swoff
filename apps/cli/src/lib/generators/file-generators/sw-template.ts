/**
 * Generates sw-template.js - the SW template with placeholders.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateSwTemplate(ctx: GeneratorContext): void {
  const code = `/**
 * Swoff Service Worker Template
 *
 * This file is processed by swoff/sw-generator.js to create
 * a versioned service worker. Placeholders are replaced during build.
 *
 * Placeholders:
 *   [[CACHE_NAME]]       - Replaced with versioned cache name
 *   [[ASSETS_LIST]]      - Replaced with assets to cache
 *   [[AUTO_SKIP_WAITING]] - Replaced with autoActivate config
 *
 * You can customize this template before running the build script.
 */

let CACHE_NAME = "";
let ASSETS_TO_CACHE = [];

// [[CACHE_NAME]]
// [[ASSETS_LIST]]
// [[AUTO_SKIP_WAITING]]

const CACHE_NAME_RUNTIME = "swoff-runtime";

// Install - download assets with progress tracking
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      let downloaded = 0;
      for (const asset of ASSETS_TO_CACHE) {
        try {
          const request = new Request(asset.url, asset.options);
          await cache.add(request);
          downloaded++;
          const percent = Math.round((downloaded / ASSETS_TO_CACHE.length) * 100);
          const clients = await self.clients.matchAll({ includeUncontrolled: true });
          clients.forEach((client) => {
            client.postMessage({
              type: "SW_PROGRESS",
              percent,
              downloaded,
              total: ASSETS_TO_CACHE.length,
            });
          });
        } catch (err) {
          console.error(\`Failed to cache \${asset.url}:\`, err);
        }
      }
      if (AUTO_SKIP_WAITING) self.skipWaiting();
    })(),
  );
});

// Activate - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== CACHE_NAME_RUNTIME).map((key) => caches.delete(key))
      )
    )
  );
});

// Message - skip waiting and cache invalidation
self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch - cache strategies
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" && event.request.method !== "HEAD") return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const runtimeCache = await caches.open(CACHE_NAME_RUNTIME);
      const url = new URL(event.request.url);

      const byPath = await cache.match(url.pathname);
      if (byPath) return byPath;

      const byRequest = await runtimeCache.match(event.request);
      if (byRequest) return byRequest;

      if (event.request.mode === "navigate") {
        const spa = await cache.match("/index.html");
        if (spa) return spa;
      }

      try {
        const response = await fetch(event.request);
        if (response.ok) {
          await runtimeCache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return new Response("Offline: content not available", { status: 503 });
      }
    })(),
  );
});

const SWOFF = {
  cache: {
    async get(key) {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(key);
    },
    async put(request, response) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response);
    },
    async delete(request) {
      const cache = await caches.open(CACHE_NAME);
      return cache.delete(request);
    }
  },
  network: {
    async fetch(request, options = {}) {
      try {
        return await fetch(request, options);
      } catch (error) {
        throw new Error(\`Network request failed: \${error.message}\`);
      }
    }
  }
};

if (typeof self !== 'undefined') {
  self.SWOFF = SWOFF;
}
`;

  writeFile(ctx, "sw-template.js", code);
}
