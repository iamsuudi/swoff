import { useCallback } from "react";
import { invalidateByTag, invalidateByTags } from "../cache/index.js";
import { invalidateUrl } from "../cache/tags.js";

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
