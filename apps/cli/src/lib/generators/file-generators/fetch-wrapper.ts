/**
 * Generates fetch-wrapper.ts/js — unified fetch with caching, auth, offline queue, auto-invalidation,
 * staleTime, prefetching, and cancellation.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateFetchWrapper(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");
  const G = (type: string) => (ts ? `<${type}>` : "");
  const tagInvalidation = ctx.config.features.tagInvalidation.enabled;
  const authEnabled = ctx.config.features.auth.enabled;
  const mutationQueue = ctx.config.features.mutationQueue.enabled;

  const importLines = [
    tagInvalidation
      ? `import { generateTags, invalidateUrl, expandCascading } from "./invalidation-tags.${ext}";`
      : "",
    tagInvalidation ? `import { invalidateByTags } from "./cache.${ext}";` : "",
    authEnabled
      ? `import { getAuth, clearAuth, withAuthHeaders, isAuthUrl, AUTH_WITH_CREDENTIALS } from "./auth/store.${ext}";`
      : "",
    mutationQueue
      ? `import { queueMutation } from "./mutation-queue.${ext}";`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const interfaceBlock = ts
    ? `
export interface FetchWithCacheResult${G("T")} {
  response${T("Response & { json(): Promise<T> }")};
  fromCache${T("boolean")};
}
`
    : "";

  const optionsInterface = ts
    ? `
export interface FetchWithCacheOptions extends RequestInit {
  tags?: string[];
  auth?: boolean;
  queueOffline?: boolean;
  invalidate?: 'auto' | string[] | false;
  type?: 'read' | 'mutation';
  strategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'cache-only' | 'network-only' | 'reactive';
  staleTime?: number;
  refetchInterval?: number;
  refetchOnReconnect?: boolean;
  refetchOnFocus?: boolean;
  /** Custom response validation for mutation success. Default: res.ok. Use this when your API returns 200 with { success: false } for logical failures. */
  validateSuccess?: (response: Response) => boolean | Promise<boolean>;
  /** Override the URL used for auto-invalidation. Defaults to the request URL. Useful when the mutation URL differs from the cache tag URL. */
  invalidateUrl?: string;
}
`
    : "";

  const authBlock = authEnabled
    ? `
  if (options.auth) {
    const auth = await getAuth();
    withAuthHeaders(headers, auth);
  }`
    : "";

  const authUrlsBlock = authEnabled
    ? `
  // Auth endpoints bypass SW cache
  if (options.auth && isAuthUrl(url) && !headers.has("X-SW-Cache-Strategy")) {
    headers.set("X-SW-Cache-Strategy", "mutation");
  }`
    : "";

  const authCredentialsBlock = authEnabled
    ? `
  if (AUTH_WITH_CREDENTIALS) {
    fetchOptions.credentials = "include";
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
      if (options.signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
      const cached = await caches.match(input);
      if (cached) return { response: cached, fromCache: true };
      throw new Error("Offline: no cached data available");
    }`;

  const offlineTagComp = tagInvalidation
    ? `      // Pre-compute invalidation tags for replay
      let queueTags: string[] = [];
      const invalidateSetting = options.invalidate !== false ? (options.invalidate || 'auto') : false;
      if (invalidateSetting !== false) {
        if (Array.isArray(invalidateSetting)) {
          queueTags = invalidateSetting;
        } else {
          queueTags = generateTags(url);
          queueTags = expandCascading(queueTags);
        }
      }`
    : `      const queueTags = options.tags || [];`;

  const offlineWriteBlock = mutationQueue
    ? `    // Write offline — auto-queue
    if (options.queueOffline !== false) {
      const headerObj: Record<string, string> = {};
      headers.forEach((value, key) => {
        headerObj[key] = value;
      });
${offlineTagComp}
      await queueMutation({
        method,
        url,
        body: options.body,
        headers: headerObj,
        tags: queueTags,
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
  const mutationSuccess = options.validateSuccess ? await options.validateSuccess(response) : response.ok;
  if (!isRead && mutationSuccess) {
    const invalidateSetting = options.invalidate !== false ? (options.invalidate || 'auto') : false;
    if (invalidateSetting !== false) {
      const invalidateTarget = options.invalidateUrl || url;
      if (Array.isArray(invalidateSetting)) {
        await invalidateByTags(invalidateSetting);
      } else {
        await invalidateUrl(invalidateTarget);
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
 * Unified fetch with caching, auth, offline queue, auto-invalidation, staleTime, prefetching, and
 * per-request strategy override.
 *
 * Usage:
 *   import { fetchWithCache, prefetchCache } from './swoff/fetch-wrapper.${ext}';
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
 *   // Skip auto-invalidation, invalidate manually later
 *   await fetchWithCache("/api/todos", {
 *     method: "POST",
 *     body: JSON.stringify({ title: "New" }),
 *     invalidate: false,
 *   });
 *
 *   // Validate mutation success with custom logic
 *   await fetchWithCache("/api/todos", {
 *     method: "POST",
 *     body: JSON.stringify({ title: "New" }),
 *     validateSuccess: (res) => res.status === 200,
 *   });
 *
 *   // Custom tags for caching (read) + explicit invalidate tags (mutation)
 *   await fetchWithCache("/api/todos", {
 *     tags: ["custom-tag"],
 *     invalidate: ["custom-tag"],
 *   });
 *
 *   // Authenticated request (works with bearer, cookie, custom)
 *   const { response: userRes } = await fetchWithCache("/api/me", { auth: true });
 *
 *   // Prefetch (fire-and-forget warm the cache)
 *   prefetchCache("/api/todos");
 *
 *   // Override caching strategy per-request (highest priority)
 *   await fetchWithCache("/api/checkout", {
 *     method: "POST",
 *     type: "read",
 *     strategy: "network-only",
 *   });
 *
 *   // Support AbortController for cancellation
 *   const controller = new AbortController();
 *   setTimeout(() => controller.abort(), 5000);
 *   const { response } = await fetchWithCache("/api/todos", { signal: controller.signal });
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

/** Fetch with caching, auth, offline queue, auto-invalidation, and per-request strategy override. Returns { response, fromCache }. Use { auth: true } for authenticated requests — works with bearer, cookie, and custom auth types. */
export async function fetchWithCache${G("T")}(input${T("RequestInfo")}, options${T("RequestInit & FetchWithCacheOptions")} = {})${R("Promise<FetchWithCacheResult<T>>")}{
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

  if (options.strategy) {
    headers.set("X-SW-Strategy", options.strategy);
  }
  if (options.staleTime !== undefined) {
    headers.set("X-SW-Stale-Time", String(options.staleTime));
  }
  if (options.refetchInterval !== undefined) {
    headers.set("X-SW-Refetch-Interval", String(options.refetchInterval));
  }
  if (options.refetchOnReconnect !== undefined) {
    headers.set("X-SW-Refetch-On-Reconnect", String(options.refetchOnReconnect));
  }
  if (options.refetchOnFocus !== undefined) {
    headers.set("X-SW-Refetch-On-Focus", String(options.refetchOnFocus));
  }
${authBlock}${authUrlsBlock}
  const fetchOptions${T("RequestInit")} = { ...options, headers };
${authCredentialsBlock}

  // Offline handling
  if (!navigator.onLine) {
${offlineReadBlock}
${offlineWriteBlock}
  }

  // Check for abort before proceeding
  if (options.signal?.aborted) {
    throw new DOMException("The operation was aborted", "AbortError");
  }

  // Deduplicate in-flight GET requests
  let responsePromise${T("Promise<Response>")};
  if (isRead && inFlightRequests.has(url)) {
    responsePromise = inFlightRequests.get(url)!.then((r) => r.clone());
  } else {
    const abortHandler = () => {
      inFlightRequests.delete(url);
    };
    if (options.signal) {
      options.signal.addEventListener("abort", abortHandler, { once: true });
    }
    responsePromise = fetch(input, fetchOptions);
    if (isRead) {
      const cleanup = () => {
        inFlightRequests.delete(url);
        if (options.signal) {
          options.signal.removeEventListener("abort", abortHandler);
        }
      };
      inFlightRequests.set(url, responsePromise.finally(cleanup));
    }
  }

  const response = await responsePromise;
${autoInvalidateBlock}${auth401Block}
  const fromCache = response.headers.get("X-SW-From-Cache") === "true";
  return { response, fromCache };
}

/** Fire-and-forget prefetch: warms the cache for a URL without blocking. Useful for route prefetching or link hover prefetching. */
export function prefetchCache(input${T("RequestInfo")}, options${T("RequestInit & FetchWithCacheOptions")} = {})${R("void")}{
  fetchWithCache(input, { ...options }).catch(() => {
    // Prefetch failures are intentionally silent
  });
}
`;

  writeFile(ctx, `fetch-wrapper.${ext}`, code);
}
