import { useState, useEffect } from "react";
import { getFetchCount } from "../fetch-state";

/**
 * Hook that returns true when any swoff fetch or mutation is in-flight.
 * Uses a global counter incremented/decremented by fetchWithCache.
 *
 * Usage:
 *   const isFetching = useIsFetching();
 *
 *   return (
 *     <>
 *       {isFetching && <Spinner />}
 *       <MainContent />
 *     </>
 *   );
 */
export function useIsFetching(): boolean {
  const [isFetching, setIsFetching] = useState(() => getFetchCount() > 0);

  useEffect(() => {
    const onChange = (e: CustomEvent<{ count: number }>) => {
      setIsFetching(e.detail.count > 0);
    };
    window.addEventListener("fetch-count-changed", onChange as EventListener);
    return () => {
      window.removeEventListener("fetch-count-changed", onChange as EventListener);
    };
  }, []);

  return isFetching;
}
