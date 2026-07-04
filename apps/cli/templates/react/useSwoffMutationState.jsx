import { useSyncExternalStore } from "react";
import { getMutationState, onMutationStateChange } from "../mutation/state.js";

function subscribeToMutations(cb) {
  return onMutationStateChange(() => cb());
}

export function useSwoffMutationState(id) {
  return useSyncExternalStore(subscribeToMutations, () =>
    id ? (getMutationState(id) ?? null) : null,
  );
}
