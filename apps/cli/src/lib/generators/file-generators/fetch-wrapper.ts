/**
 * Generates fetch-wrapper.ts/js — unified fetch with caching, auth, offline queue, and auto-invalidation.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateFetchWrapper(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");
  const G = (type: string) => (ts ? `<${type}>` : "");
  const tagInvalidation = ctx.config.features.tagInvalidation;
  const authEnabled = ctx.config.features.auth.enabled;
  const mutationQueue = ctx.config.features.mutationQueue;

  const importLines = [
    tagInvalidation
      ? `import { generateTags } from "./invalidation-tags.${ext}";`
      : "",
    tagInvalidation ? `import { invalidateByTags } from "./cache.${ext}";` : "",
    authEnabled
      ? `import { getAuth, clearAuth } from "./auth/store.${ext}";`
      : "",
    mutationQueue
      ? `import { queueMutation } from "./mutation-queue.${ext}";`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const interfaceBlock = ts
    ? `
export interface FetchWithCacheResult {
  response${T("Response")};
  fromCache${T("boolean")};
}
`
    : "";

  const optionsType = ts ? `FetchWithCacheOptions` : `options`;

  const optionsInterface = ts
    ? `
export interface FetchWithCacheOptions extends RequestInit {
  tags?: string[];
  staleWhileRevalidate?: boolean;
  auth?: boolean;
  queueOffline?: boolean;
  invalidate?: 'auto' | string[] | false;
  type?: 'read' | 'mutation';
}
`
    : "";

  const authBlock = authEnabled
    ? `
  if (options.auth) {
    const auth = await getAuth();
    if (auth?.token) {
      headers.set("Authorization", \`Bearer \${auth.token}\`);
    }
  }`
    : "";

  const authUrlsBlock = authEnabled
    ? `
  // Auth endpoints bypass SW cache
  const authPaths = ["/login", "/logout", "/register"];
  if (options.auth && authPaths.some((p) => url.includes(p)) && !headers.has("X-SW-Cache-Strategy")) {
    headers.set("X-SW-Cache-Strategy", "mutation");
  }`
    : "";

  const auth401Block = authEnabled
    ? `
  if (options.auth && response.status === 401) {
    await clearAuth();
    window.dispatchEvent(new CustomEvent("sw-auth-unauthorized"));
  }`
    : "";

  const offlineReadBlock = `    if (isRead) {
      const cached = await caches.match(input);
      if (cached) return { response: cached, fromCache: true };
      throw new Error("Offline: no cached data available");
    }`;

  const offlineWriteBlock = mutationQueue
    ? `    // Write offline — auto-queue
    if (options.queueOffline !== false) {
      const headerObj: Record<string, string> = {};
      headers.forEach((value, key) => {
        headerObj[key] = value;
      });
      await queueMutation({
        method,
        url,
        body: options.body,
        headers: headerObj,
        tags: options.tags || [],
        timestamp: Date.now(),
      });
      return {
        response: new Response(null, { status: 202, statusText: "Queued" }),
        fromCache: false,
      };
    }
    throw new Error("Offline: write operation failed");`
    : `    throw new Error("Offline: write operation failed");`;

  const autoInvalidateBlock = tagInvalidation
    ? `
  // Auto-invalidate after mutation success
  if (!isRead && response.ok) {
    const invalidateSetting = options.invalidate !== false ? (options.invalidate || 'auto') : false;
    if (invalidateSetting !== false) {
      const tagsToInvalidate${T("string[]")} = Array.isArray(invalidateSetting)
        ? invalidateSetting
        : (options.tags || generateTags(url));
      if (tagsToInvalidate.length > 0) {
        await invalidateByTags(tagsToInvalidate);
      }
    }
  }`
    : "";

  const autoTagsBlock = tagInvalidation
    ? `
  // Auto-generate tags from URL if not provided
  if (!options.tags && isRead) {
    const urlTags = generateTags(url);
    if (urlTags.length > 0) {
      headers.set("X-SW-Cache-Tags", urlTags.join(","));
    }
  }`
    : "";

  const code = `/**
 * Swoff Fetch Wrapper
 * Unified fetch with caching, auth, offline queue, and auto-invalidation.
 *
 * Usage:
 *   import { fetchWithCache } from './swoff/fetch-wrapper.${ext}';
 *
 *   // GET — cached with auto-generated tags
 *   const { response } = await fetchWithCache("/api/todos");
 *   const data = await response.json();
 *
 *   // POST — mutation with auto-invalidation
 *   await fetchWithCache("/api/todos", {
 *     method: "POST",
 *     body: JSON.stringify({ title: "New task" }),
 *   });
 *
 *   // Authenticated request
 *   const { response: userRes } = await fetchWithCache("/api/me", { auth: true });
 *
 *   // Custom tags + stale-while-revalidate
 *   const { response: staleRes, fromCache } = await fetchWithCache("/api/data", {
 *     tags: ["data"],
 *     staleWhileRevalidate: true,
 *   });
 *
 *   // Override method-based caching with explicit type
 *   // Use type: "mutation" for POST-based reads (search, GraphQL)
 *   await fetchWithCache("/api/search", {
 *     method: "POST",
 *     type: "read",
 *     body: JSON.stringify({ query: "hello" }),
 *   });
 *
 *   // Offline: auto-queues writes (disable with queueOffline: false)
 *   await fetchWithCache("/api/todos", {
 *     method: "POST",
 *     body: JSON.stringify({ title: "Offline task" }),
 *   });
 *   // When back online, processMutationQueue() replays them
 */

${importLines}
${interfaceBlock}${optionsInterface}
const inFlightRequests = new Map${G("string, Promise<Response>")}();

/** Fetch with caching, auth, offline queue, and auto-invalidation. Returns { response, fromCache }. */
export async function fetchWithCache(input${T("RequestInfo")}, options${T("RequestInit & { tags?: string[]; staleWhileRevalidate?: boolean; auth?: boolean; queueOffline?: boolean; invalidate?: 'auto' | string[] | false; type?: 'read' | 'mutation' }")} = {})${R("Promise<FetchWithCacheResult>")}{
  const method = (options.method || "GET").toUpperCase();
  const isRead = options.type === "read" || (options.type !== "mutation" && (method === "GET" || method === "HEAD"));
  const url = typeof input === "string" ? input : input.url;

  const headers = new Headers(options.headers);

  // Set cache strategy
  if (!headers.has("X-SW-Cache-Strategy")) {
    headers.set("X-SW-Cache-Strategy", isRead ? "read" : "mutation");
  }
${autoTagsBlock}
  // Custom tags override auto-generated
  if (options.tags && options.tags.length > 0) {
    headers.set("X-SW-Cache-Tags", options.tags.join(","));
  }

  if (options.staleWhileRevalidate) {
    headers.set("X-SW-Stale", "true");
  }
${authBlock}${authUrlsBlock}
  const fetchOptions${T("RequestInit")} = { ...options, headers };

  // Offline handling
  if (!navigator.onLine) {
${offlineReadBlock}
${offlineWriteBlock}
  }

  // Deduplicate in-flight GET requests
  let responsePromise${T("Promise<Response>")};
  if (isRead && inFlightRequests.has(url)) {
    responsePromise = inFlightRequests.get(url)!.then((r) => r.clone());
  } else {
    responsePromise = fetch(input, fetchOptions);
    if (isRead) {
      inFlightRequests.set(url, responsePromise.finally(() => inFlightRequests.delete(url)));
    }
  }

  const response = await responsePromise;
${autoInvalidateBlock}${auth401Block}
  const fromCache = response.headers.get("X-SW-From-Cache") === "true";
  return { response, fromCache };
}
`;

  writeFile(ctx, `fetch-wrapper.${ext}`, code);
}
