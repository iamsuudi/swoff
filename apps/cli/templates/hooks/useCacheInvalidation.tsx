import { useCallback } from "react";
import { invalidateByTag, invalidateByTags } from "../cache.ts";
import { invalidateUrl } from "../invalidation-tags.ts";

/**
 * Hook exposing cache invalidation functions for manual control.
 *
 * Useful when you need to invalidate the cache after a mutation that wasn't
 * automatically handled (e.g., a third-party API, a non-fetchWithCache call).
 *
 * Invalidation triggers:
 *   - The service worker refetches cached URLs for the invalidated tags
 *   - Active useCachedFetch hooks for those URLs auto-refetch
 *   - The "cache-invalidated" CustomEvent is dispatched on window
 *
 * Usage:
 *   const { invalidateByTag, invalidateByTags, invalidateUrl } = useCacheInvalidation();
 *
 *   // Invalidate by a single tag
 *   await invalidateByTag("todos");
 *
 *   // Invalidate by multiple tags at once
 *   await invalidateByTags(["todos", "projects"]);
 *
 *   // Invalidate a specific URL
 *   await invalidateUrl("/api/todos");
 *
 * Auth behavior:
 *   Invalidation is auth-agnostic. If the refetched URL requires auth headers,
 *   the service worker's refetch (from tag-management.ts) will replay the
 *   original request's method and body. For GET requests, no auth headers are
 *   sent during invalidation-based refetch — this is correct for cookie auth
 *   (browser sends cookies automatically), but for bearer auth the user
 *   endpoint fetch is handled by refreshSession/fetchCurrentUser in auth/user.ts.
 *
 * @returns {{ invalidateByTag, invalidateByTags, invalidateUrl }}
 */
export function useCacheInvalidation() {
  const invalidateTag = useCallback(async (tag: string) => {
    await invalidateByTag(tag);
  }, []);

  const invalidateTags = useCallback(async (tags: string[]) => {
    await invalidateByTags(tags);
  }, []);

  const invalidateCacheUrl = useCallback(async (url: string) => {
    await invalidateUrl(url);
  }, []);

  return { invalidateByTag: invalidateTag, invalidateByTags: invalidateTags, invalidateUrl: invalidateCacheUrl };
}
