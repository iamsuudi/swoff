/**
 * Swoff Fetch Wrapper
 * Unified fetch with caching, auth, offline queue, auto-invalidation, staleTime, prefetching, and
 * per-request strategy override.
 *
 * Usage:
 *   import { fetchWithCache, prefetchCache } from './swoff/fetch/core.ts';
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

import { API_BASE } from "../config.ts";
import { generateTags, invalidateUrl, expandCascading } from "../cache/tags.ts";
import { invalidateByTags } from "../cache/index.ts";
import { getAuth, clearAuth, withAuthHeaders, isAuthUrl, ensureValidAuth, AUTH_WITH_CREDENTIALS } from "../auth/store.ts";
import { queueMutation } from "../offline/queue.ts";
import { incrementFetchCount, decrementFetchCount } from "../fetch/state.ts";

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
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
  /** Custom response validation for mutation success. Default: res.ok. Use this when your API returns 200 with { success: false } for logical failures. */
  validateSuccess?: (response: Response) => boolean | Promise<boolean>;
  /** Override the URL used for auto-invalidation. Defaults to the request URL. Useful when the mutation URL differs from the cache tag URL. */
  invalidateUrl?: string;
  /** Skip global fetch counter tracking. Used by prefetchCache to avoid triggering loading bars. */
  skipFetchCount?: boolean;
}

const inFlightRequests = new Map<string, Promise<Response>>();
const pendingBatches = new Map<string, { resolvers: Array<(r: Response) => void>; rejectors: Array<(e: unknown) => void>; timer: ReturnType<typeof setTimeout> }>();
const BATCH_WINDOW_MS = 50;

/** Fetch with caching, auth, offline queue, auto-invalidation, and per-request strategy override. Returns { response, fromCache }. Use { auth: true } for authenticated requests — works with bearer, cookie, and custom auth types. */
export async function fetchWithCache<T>(input: RequestInfo, options: RequestInit & FetchWithCacheOptions = {}): Promise<FetchWithCacheResult<T>> {
  if (!options.skipFetchCount) incrementFetchCount();
  try {
  const method = (options.method || "GET").toUpperCase();
  const isRead = options.type === "read" || (options.type !== "mutation" && (method === "GET" || method === "HEAD" || method === "OPTIONS"));
  const resolvedInput = typeof input === "string" && !input.startsWith("http") && !input.startsWith("//") ? API_BASE + input : input;
  const url = typeof resolvedInput === "string" ? resolvedInput : resolvedInput.url;

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
  if (options.refetchOnFocus !== undefined) {
    headers.set("X-SW-Refetch-On-Focus", String(options.refetchOnFocus));
  }
  if (options.refetchOnReconnect !== undefined) {
    headers.set("X-SW-Refetch-On-Reconnect", String(options.refetchOnReconnect));
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
  // Pre-compute invalidation tags for SW-side IDB storage
  let mutationTags: string[] = [];
  if (!isRead) {
    const invalidateSetting = options.invalidate !== false ? (options.invalidate || 'auto') : false;
    if (invalidateSetting !== false) {
      if (Array.isArray(invalidateSetting)) {
        mutationTags = invalidateSetting;
      } else {
        mutationTags = generateTags(url);
        mutationTags = expandCascading(mutationTags);
      }
      headers.set("X-SW-Invalidate-Tags", mutationTags.join(","));
    }
  }
  // Request batching + dedup for concurrent reads
  let responsePromise: Promise<Response>;
  if (isRead && inFlightRequests.has(url)) {
    responsePromise = inFlightRequests.get(url)!.then((r) => r.clone());
  } else if (isRead && pendingBatches.has(url)) {
    responsePromise = new Promise((resolve, reject) => {
      pendingBatches.get(url)!.resolvers.push(resolve);
      pendingBatches.get(url)!.rejectors.push(reject);
    });
  } else {
    const abortHandler = () => {
      inFlightRequests.delete(url);
    };
    if (options.signal) {
      options.signal.addEventListener("abort", abortHandler, { once: true });
    }
    if (isRead && BATCH_WINDOW_MS > 0) {
      const batch: { resolvers: Array<(r: Response) => void>; rejectors: Array<(e: unknown) => void>; timer: ReturnType<typeof setTimeout> } = { resolvers: [], rejectors: [], timer: 0 };
      pendingBatches.set(url, batch);
      batch.timer = setTimeout(() => {
        pendingBatches.delete(url);
        const promise = fetch(resolvedInput, fetchOptions);
        const cleanup = () => {
          inFlightRequests.delete(url);
          if (options.signal) {
            options.signal.removeEventListener("abort", abortHandler);
          }
        };
        inFlightRequests.set(url, promise.finally(cleanup));
        promise.then((r) => {
          batch.resolvers.forEach((res) => res(r.clone()));
        }).catch((err) => {
          batch.rejectors.forEach((rej) => rej(err));
        });
      }, BATCH_WINDOW_MS);
      responsePromise = new Promise((resolve, reject) => {
        batch.resolvers.push(resolve);
        batch.rejectors.push(reject);
      });
    } else {
      responsePromise = fetch(resolvedInput, fetchOptions);
    }
  }

  let response: Response;
  try {
    response = await responsePromise;
  } catch (err) {
    if (err instanceof TypeError) {
      if (isRead) {
    if (options.signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
      const cached = await caches.match(resolvedInput);
      if (cached) return { response: cached, fromCache: true, queued: false };
      throw new Error("Offline: no cached data available", { cause: err });
      }
      // SW not controlling — fallback to client-side queue
      if (!navigator.serviceWorker?.controller) {
    if (options.queueOffline !== false) {
      const ct = headers.get("Content-Type");
      await queueMutation({
        method,
        url,
        body: options.body,
        headers: ct ? { "Content-Type": ct } : {},
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
    // Check if the token is actually expired by probing the user endpoint
    try {
      const authCheck = await fetch(API_BASE + "/api/me", {
        headers: { "Authorization": headers.get("Authorization") } as HeadersInit,
        credentials: AUTH_WITH_CREDENTIALS ? "include" : undefined,
      });
      if (authCheck.status === 401) {
        // Token expired — try silent refresh
        const refreshed = await ensureValidAuth();
        if (refreshed?.token) {
          // Retry original request with fresh token
          const retryHeaders = new Headers(options.headers);
          withAuthHeaders(retryHeaders, refreshed);
          response = await fetch(resolvedInput, { ...fetchOptions, headers: retryHeaders });
        } else {
          await clearAuth();
          window.dispatchEvent(new CustomEvent("sw-auth-unauthorized"));
        }
      }
      // authCheck 200: user IS authenticated but lacks permission — let original 401 propagate
    } catch {
      await clearAuth();
      window.dispatchEvent(new CustomEvent("sw-auth-unauthorized"));
    }
  }
  const fromCache = response.headers.get("X-SW-From-Cache") === "true";
  const queued = response.headers.get("X-SW-Mutation-Queued") === "true";
  return { response, fromCache, queued };
  } finally {
    if (!options.skipFetchCount) decrementFetchCount();
  }
}

/** Fire-and-forget prefetch: warms the cache for a URL without blocking. Useful for route prefetching or link hover prefetching. */
export function prefetchCache(input: RequestInfo, options: RequestInit & FetchWithCacheOptions = {}): void {
  fetchWithCache(input, { ...options, skipFetchCount: true }).catch(() => {
    // Prefetch failures are intentionally silent
  });
}
