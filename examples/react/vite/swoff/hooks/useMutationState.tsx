import { useState, useEffect } from "react";
import {
  getMutationState,
  onMutationStateChange,
} from "../mutation-state.ts";
import type { MutationState } from "../mutation-state.ts";

/**
 * Hook that subscribes to a specific mutation's state changes.
 * Useful for showing per-mutation loading spinners, error states, etc.
 *
 * Usage:
 *   const mutation = useMutationState(mutationId);
 *   if (mutation?.status === "error") { ... }
 */
export function useMutationState(id: string | null): MutationState | null {
  const [state, setState] = useState<MutationState | null>(() =>
    id ? getMutationState(id) ?? null : null,
  );

  useEffect(() => {
    if (!id) {
      setState(null);
      return;
    }

    // Initial state
    setState(getMutationState(id) ?? null);

    // Subscribe to changes
    const unsub = onMutationStateChange((updated) => {
      if (updated.id === id) {
        setState(updated);
      }
    });

    return unsub;
  }, [id]);

  return state;
}
