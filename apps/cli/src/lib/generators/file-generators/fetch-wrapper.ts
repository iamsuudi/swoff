/**
 * Generates fetch-wrapper.js - fetch with cache strategy headers and deduplication.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateFetchWrapper(ctx: GeneratorContext): void {
  const code = `/**
 * Swoff Fetch Wrapper
 * Framework-agnostic fetch with cache strategy, tags, and query deduplication.
 *
 * Usage:
 *   import { fetchWithCache } from './swoff/fetch-wrapper.js';
 *
 *   // GET - cached with tag
 *   const todos = await fetchWithCache("/api/todos", { tags: ["todos"] }).then(r => r.json());
 *
 *   // POST - mutation (passes through to server)
 *   await fetchWithCache("/api/todos", {
 *     method: "POST",
 *     body: JSON.stringify({ title: "New task" }),
 *   });
 *
 *   // Stale-while-revalidate
 *   const data = await fetchWithCache("/api/data", {
 *     tags: ["data"],
 *     staleWhileRevalidate: true,
 *   }).then(r => r.json());
 */

const inFlightRequests = new Map();

export async function fetchWithCache(input, options = {}) {
  const headers = new Headers(options.headers);
  const method = options.method || "GET";

  if (!headers.has("X-SW-Cache-Strategy")) {
    headers.set(
      "X-SW-Cache-Strategy",
      method === "GET" || method === "HEAD" ? "read" : "mutation"
    );
  }

  if (options.staleWhileRevalidate) {
    headers.set("X-SW-Stale", "true");
  }

  if (options.tags && options.tags.length > 0) {
    headers.set("X-SW-Cache-Tags", options.tags.join(","));
  }

  if (method === "GET" || method === "HEAD") {
    const url = typeof input === "string" ? input : input.url;
    if (inFlightRequests.has(url)) {
      return inFlightRequests.get(url).then((r) => r.clone());
    }
    const promise = fetch(input, { ...options, headers }).finally(() => {
      inFlightRequests.delete(url);
    });
    inFlightRequests.set(url, promise);
    return promise;
  }

  return fetch(input, { ...options, headers });
}

export async function fetchWithCacheOrQueue(input, options = {}) {
  if (!navigator.onLine) {
    if (options.method === "GET" || options.method === "HEAD") {
      const cached = await caches.match(input);
      if (cached) return cached;
      throw new Error("Offline: no cached data");
    } else {
      throw new Error("Offline: mutation queued");
    }
  }
  return fetchWithCache(input, options);
}
`;

  writeFile(ctx, "fetch-wrapper.js", code);
}
