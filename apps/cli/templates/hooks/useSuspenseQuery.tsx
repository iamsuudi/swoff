import { useRef } from "react";
import { fetchWithCache } from "../fetch-wrapper";
import type { FetchWithCacheOptions } from "../fetch-wrapper";

interface SuspenseEntry<T> {
  url: string;
  promise: Promise<void> | null;
  data: T | null;
  error: Error | null;
}

/**
 * Hook that throws a promise on cache miss (caught by React Suspense)
 * and returns cached data on subsequent renders.
 *
 * Usage:
 *   // Wrap the parent in <Suspense fallback={<Skeleton />}>
 *   const data = useSuspenseQuery<User>("/api/me", { auth: true });
 *
 *   // With error boundary:
 *   <ErrorBoundary fallback={<ErrorUI />}>
 *     <Suspense fallback={<Skeleton />}>
 *       <Profile />
 *     </Suspense>
 *   </ErrorBoundary>
 *
 * Notes:
 *   - error is thrown so ErrorBoundary (not Suspense) catches it
 *   - promise is thrown so Suspense catches it
 *   - on URL change the entry resets and re-suspends
 */
export function useSuspenseQuery<T = unknown>(
  url: string,
  options?: FetchWithCacheOptions & { enabled?: boolean },
): T {
  const enabled = options?.enabled !== false;
  const entry = useRef<SuspenseEntry<T>>({
    url: "",
    promise: null,
    data: null,
    error: null,
  });

  if (!enabled || !url) {
    return undefined as T;
  }

  // URL changed — reset entry
  if (entry.current.url !== url) {
    entry.current = { url, promise: null, data: null, error: null };
  }

  const cur = entry.current;

  if (cur.data !== null) return cur.data;

  if (cur.error) throw cur.error;

  if (cur.promise) throw cur.promise;

  cur.promise = fetchWithCache<T>(url, options)
    .then(async (res) => {
      const data = await res.response.json();
      cur.data = data;
      cur.promise = null;
    })
    .catch((err) => {
      cur.error = err instanceof Error ? err : new Error(String(err));
      cur.promise = null;
    });

  throw cur.promise;
}
