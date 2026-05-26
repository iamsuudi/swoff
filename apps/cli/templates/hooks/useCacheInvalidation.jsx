import { useCallback } from "react";
import { invalidateByTag, invalidateByTags } from "../cache.js";
import { invalidateUrl } from "../invalidation-tags.js";

export function useCacheInvalidation() {
  const invalidateTag = useCallback(async (tag) => {
    await invalidateByTag(tag);
  }, []);

  const invalidateTags = useCallback(async (tags) => {
    await invalidateByTags(tags);
  }, []);

  const invalidateCacheUrl = useCallback(async (url) => {
    await invalidateUrl(url);
  }, []);

  return { invalidateByTag: invalidateTag, invalidateByTags: invalidateTags, invalidateUrl: invalidateCacheUrl };
}
