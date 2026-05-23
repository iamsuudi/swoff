import { useState, useEffect } from "react";
import { getPendingCount } from "../../swoff/mutation-queue";

export function usePendingQueue() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getPendingCount().then((n) => { if (!cancelled) setPendingCount(n); });

    const handler = () => {
      getPendingCount().then(setPendingCount);
    };
    window.addEventListener("mutation-queue-changed", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("mutation-queue-changed", handler);
    };
  }, []);

  return { pendingCount, hasPending: pendingCount > 0 };
}
