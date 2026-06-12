import { useSyncExternalStore } from "react";
import {
  getMutationState,
  onMutationStateChange,
} from "../offline/state.ts";
import type { MutationState } from "../offline/state.ts";

function subscribeToMutations(cb: () => void) {
  return onMutationStateChange(() => cb());
}

/**
 * Hook that subscribes to a specific mutation's state changes.
 * Useful for showing per-mutation loading spinners, error states, etc.
 *
 * Usage:
 *   const mutation = useMutationState(mutationId);
 *   if (mutation?.status === "error") { ... }
 */
export function useMutationState(id: string | null): MutationState | null {
  return useSyncExternalStore(
    subscribeToMutations,
    () => (id ? getMutationState(id) ?? null : null),
  );
}
