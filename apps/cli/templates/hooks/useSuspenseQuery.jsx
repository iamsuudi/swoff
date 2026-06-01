import { useRef } from "react";
import { fetchWithCache } from "../fetch-wrapper";

/**
 * Hook that throws a promise on cache miss (caught by React Suspense)
 * and returns cached data on subsequent renders.
 *
 * Usage:
 *   // Wrap the parent in <Suspense fallback={<Skeleton />}>
 *   const data = useSuspenseQuery("/api/me", { auth: true });
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
 *   - on URL change the entry resets and re-suspend
 */
export function useSuspenseQuery(url, options) {
  const enabled = options?.enabled !== false;
  const entry = useRef({
    url: "",
    promise: null,
    data: null,
    error: null,
  });

  if (!enabled || !url) {
    return undefined;
  }

  if (entry.current.url !== url) {
    entry.current = { url, promise: null, data: null, error: null };
  }

  const cur = entry.current;

  if (cur.data !== null) return cur.data;

  if (cur.error) throw cur.error;

  if (cur.promise) throw cur.promise;

  cur.promise = fetchWithCache(url, options)
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
