import { useEffect, useRef } from "react";

export function useMutationSync(onSync?: () => void, resource?: string) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    const handleSync = () => onSyncRef.current?.();
    const handleInvalidation = (e: Event) => {
      if (!resource) { onSyncRef.current?.(); return; }
      const detail = (e as CustomEvent).detail;
      const tags: string[] = detail?.tags || [];
      if (tags.some((t) => t.includes(resource))) onSyncRef.current?.();
    };
    window.addEventListener("mutation-sync-complete", handleSync);
    window.addEventListener("cache-invalidated", handleInvalidation);
    return () => {
      window.removeEventListener("mutation-sync-complete", handleSync);
      window.removeEventListener("cache-invalidated", handleInvalidation);
    };
  }, [resource]);
}
