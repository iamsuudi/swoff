import { useCallback } from "react";
import { invalidateByTag, invalidateByTags } from "../cache.ts";
import { invalidateUrl } from "../invalidation-tags.ts";

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
