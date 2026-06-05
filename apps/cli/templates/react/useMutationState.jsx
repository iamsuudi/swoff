import { useSyncExternalStore } from "react";
import { getMutationState, onMutationStateChange } from "../offline/state.js";

function subscribeToMutations(cb) {
  return onMutationStateChange(() => cb());
}

export function useMutationState(id) {
  return useSyncExternalStore(
    subscribeToMutations,
    () => (id ? getMutationState(id) ?? null : null),
  );
}
