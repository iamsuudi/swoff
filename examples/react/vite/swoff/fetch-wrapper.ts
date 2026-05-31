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

import { generateTags, invalidateUrl, expandCascading } from "./invalidation-tags.ts";
import { invalidateByTags } from "./cache.ts";
import { getAuth, clearAuth, withAuthHeaders, isAuthUrl, AUTH_WITH_CREDENTIALS } from "./auth/store.ts";
import { queueMutation } from "./mutation-queue.ts";

export interface FetchWithCacheResult<T> {
  response: Response & { json(): Promise<T> };
  fromCache: boolean;
  queued: boolean;
}

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

const inFlightRequests = new Map<string, Promise<Response>>();

/** Fetch with caching, auth, offline queue, auto-invalidation, and per-request strategy override. Returns { response, fromCache }. Use { auth: true } for authenticated requests — works with bearer, cookie, and custom auth types. */
export async function fetchWithCache<T>(input: RequestInfo, options: RequestInit & FetchWithCacheOptions = {}): Promise<FetchWithCacheResult<T>> {
  const method = (options.method || "GET").toUpperCase();
  const isRead = options.type === "read" || (options.type !== "mutation" && (method === "GET" || method === "HEAD" || method === "OPTIONS"));
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

  if (options.auth) {
    const auth = await getAuth();
    withAuthHeaders(headers, auth);
  }
  // Auth endpoints bypass SW cache
  if (options.auth && isAuthUrl(url) && !headers.has("X-SW-Cache-Strategy")) {
    headers.set("X-SW-Cache-Strategy", "mutation");
  }
  // Forward no-queue option to SW
  if (options.queueOffline === false) {
    headers.set("X-SW-No-Queue", "true");
  }

  const fetchOptions: RequestInit = { ...options, headers };

  if (AUTH_WITH_CREDENTIALS) {
    fetchOptions.credentials = "include";
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

  let response: Response;
  try {
    response = await responsePromise;
  } catch (err) {
    if (err instanceof TypeError) {
      if (isRead) {
    if (options.signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
      const cached = await caches.match(input);
      if (cached) return { response: cached, fromCache: true };
      throw new Error("Offline: no cached data available");
      }
      // SW not controlling — fallback to client-side queue
      if (!navigator.serviceWorker?.controller) {
    if (options.queueOffline !== false) {
      await queueMutation({
        method,
        url,
        body: options.body,
        headers: {},
        tags: mutationTags,
        timestamp: Date.now(),
      });
      return {
        response: new Response(JSON.stringify({ queued: true }), { status: 202, headers: { "Content-Type": "application/json" } }),
        fromCache: false,
        queued: true,
      };
    }
      }
    }
    throw err;
  }

  // Auto-invalidate after mutation success (skip if SW queued it)
  const mutationSuccess = options.validateSuccess ? await options.validateSuccess(response) : response.ok;
  const mutationQueued = response.headers.get("X-SW-Mutation-Queued") === "true";
  if (!isRead && mutationSuccess && !mutationQueued) {
    const invalidateSetting = options.invalidate !== false ? (options.invalidate || 'auto') : false;
    if (invalidateSetting !== false) {
      const invalidateTarget = options.invalidateUrl || url;
      if (Array.isArray(invalidateSetting)) {
        await invalidateByTags(invalidateSetting);
      } else {
        await invalidateUrl(invalidateTarget);
      }
    }
  }
  if (options.auth && response.status === 401) {
    await clearAuth();
    window.dispatchEvent(new CustomEvent("sw-auth-unauthorized"));
  }
  const fromCache = response.headers.get("X-SW-From-Cache") === "true";
  const queued = response.headers.get("X-SW-Mutation-Queued") === "true";
  return { response, fromCache, queued };
}

/** Fire-and-forget prefetch: warms the cache for a URL without blocking. Useful for route prefetching or link hover prefetching. */
export function prefetchCache(input: RequestInfo, options: RequestInit & FetchWithCacheOptions = {}): void {
  fetchWithCache(input, { ...options }).catch(() => {
    // Prefetch failures are intentionally silent
  });
}
