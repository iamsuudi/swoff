/**
 * Swoff Fetch Wrapper
 * Unified fetch with caching, auth, offline queue, auto-invalidation, staleTime, prefetching, and
 * per-request strategy override.
 *
 * Usage:
 *   import { fetchWithCache, prefetchCache } from './swoff/fetch-wrapper.ts';
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
 *   // Authenticated request (works with bearer, cookie, custom)
 *   const { response: userRes } = await fetchWithCache("/api/me", { auth: true });
 *
 *   // Custom tags + stale-while-revalidate
 *   const { response: staleRes, fromCache } = await fetchWithCache("/api/data", {
 *     tags: ["data"],
 *     staleWhileRevalidate: true,
 *   });
 *
 *   // Set staleTime per-request (overrides config — SW handles bg refresh)
 *   await fetchWithCache("/api/todos", { staleTime: 30 });
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

import { generateTags } from "./invalidation-tags.ts";
import { invalidateByTags } from "./cache.ts";
import { getAuth, clearAuth, withAuthHeaders, isAuthUrl, AUTH_WITH_CREDENTIALS } from "./auth/store.ts";
import { queueMutation } from "./mutation-queue.ts";

export interface FetchWithCacheResult<T> {
  response: Response & { json(): Promise<T> };
  fromCache: boolean;
}

export interface ResolvedFetchConfig {
  staleTime: number;
  refetchOnWindowFocus: boolean;
  refetchOnReconnect: boolean;
  refetchInterval: number;
}

export interface FetchWithCacheOptions extends RequestInit {
  tags?: string[];
  staleWhileRevalidate?: boolean;
  auth?: boolean;
  queueOffline?: boolean;
  invalidate?: 'auto' | string[] | false;
  type?: 'read' | 'mutation';
  strategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'cache-only' | 'network-only';
  staleTime?: number;
}

const inFlightRequests = new Map<string, Promise<Response>>();

/** Fetch with caching, auth, offline queue, auto-invalidation, and per-request strategy override. Returns { response, fromCache }. Use { auth: true } for authenticated requests — works with bearer, cookie, and custom auth types. */
export async function fetchWithCache<T>(input: RequestInfo, options: RequestInit & { tags?: string[]; staleWhileRevalidate?: boolean; auth?: boolean; queueOffline?: boolean; invalidate?: 'auto' | string[] | false; type?: 'read' | 'mutation'; strategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'cache-only' | 'network-only'; staleTime?: number } = {}): Promise<FetchWithCacheResult<T>> {
  const method = (options.method || "GET").toUpperCase();
  const isRead = options.type === "read" || (options.type !== "mutation" && (method === "GET" || method === "HEAD"));
  const url = typeof input === "string" ? input : input.url;

  const headers = new Headers(options.headers);

  // Set cache strategy
  if (!headers.has("X-SW-Cache-Strategy")) {
    headers.set("X-SW-Cache-Strategy", isRead ? "read" : "mutation");
  }

  // Auto-generate tags from URL if not provided
  if (!options.tags && isRead) {
    const urlTags = generateTags(url);
    if (urlTags.length > 0) {
      headers.set("X-SW-Cache-Tags", urlTags.join(","));
    }
  }
  // Custom tags override auto-generated
  if (options.tags && options.tags.length > 0) {
    headers.set("X-SW-Cache-Tags", options.tags.join(","));
  }

  if (options.staleWhileRevalidate && !options.strategy) {
    headers.set("X-SW-Strategy", "stale-while-revalidate");
  }
  if (options.strategy) {
    headers.set("X-SW-Strategy", options.strategy);
  }
  // Pass staleTime to SW if set at per-request level
  if (options.staleTime !== undefined) {
    headers.set("X-SW-Stale-Time", String(options.staleTime));
  }

  if (options.auth) {
    const auth = await getAuth();
    withAuthHeaders(headers, auth);
  }
  // Auth endpoints bypass SW cache
  if (options.auth && isAuthUrl(url) && !headers.has("X-SW-Cache-Strategy")) {
    headers.set("X-SW-Cache-Strategy", "mutation");
  }
  const fetchOptions: RequestInit = { ...options, headers };

  if (AUTH_WITH_CREDENTIALS) {
    fetchOptions.credentials = "include";
  }

  // Offline handling
  if (!navigator.onLine) {
    if (isRead) {
      if (options.signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
      const cached = await caches.match(input);
      if (cached) return { response: cached, fromCache: true };
      throw new Error("Offline: no cached data available");
    }
    // Write offline — auto-queue
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
    throw new Error("Offline: write operation failed");
  }

  // Check for abort before proceeding
  if (options.signal?.aborted) {
    throw new DOMException("The operation was aborted", "AbortError");
  }

  // Deduplicate in-flight GET requests
  let responsePromise: Promise<Response>;
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

  // Auto-invalidate after mutation success
  if (!isRead && response.ok) {
    const invalidateSetting = options.invalidate !== false ? (options.invalidate || 'auto') : false;
    if (invalidateSetting !== false) {
      const tagsToInvalidate: string[] = Array.isArray(invalidateSetting)
        ? invalidateSetting
        : (options.tags || generateTags(url));
      if (tagsToInvalidate.length > 0) {
        await invalidateByTags(tagsToInvalidate);
      }
    }
  }
  if (options.auth && response.status === 401) {
    await clearAuth();
    window.dispatchEvent(new CustomEvent("sw-auth-unauthorized"));
  }
  const fromCache = response.headers.get("X-SW-From-Cache") === "true";
  return { response, fromCache };
}

/** Fire-and-forget prefetch: warms the cache for a URL without blocking. Useful for route prefetching or link hover prefetching. */
export function prefetchCache(input: RequestInfo, options: RequestInit & { tags?: string[]; staleWhileRevalidate?: boolean; auth?: boolean; queueOffline?: boolean; invalidate?: 'auto' | string[] | false; type?: 'read' | 'mutation'; strategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'cache-only' | 'network-only'; staleTime?: number } = {}): void {
  fetchWithCache(input, { ...options }).catch(() => {
    // Prefetch failures are intentionally silent
  });
}
