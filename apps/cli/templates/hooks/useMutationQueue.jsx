import { useState, useEffect } from "react";
import { getPendingCount } from "../mutation-queue.js";

export function useMutationQueue() {
  const [state, setState] = useState({
    pending: 0,
    lastSync: null,
  });

  useEffect(() => {
    getPendingCount().then((count) => setState((s) => ({ ...s, pending: count })));

    const onSync = (e) => {
      getPendingCount().then((count) => {
        setState({
          pending: count,
          lastSync: { succeeded: e.detail.succeeded, failed: e.detail.failed },
        });
      });
    };
    const onChange = () => {
      getPendingCount().then((count) => setState((s) => ({ ...s, pending: count })));
    };

    window.addEventListener("mutation-sync-complete", onSync);
    window.addEventListener("mutation-queue-changed", onChange);
    return () => {
      window.removeEventListener("mutation-sync-complete", onSync);
      window.removeEventListener("mutation-queue-changed", onChange);
    };
  }, []);

  return state;
}
