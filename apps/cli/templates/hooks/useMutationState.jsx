import { useState, useEffect } from "react";
import { getMutationState, onMutationStateChange } from "../mutation-state.js";

export function useMutationState(id) {
  const [state, setState] = useState(() =>
    id ? (getMutationState(id) ?? null) : null,
  );

  useEffect(() => {
    if (!id) {
      queueMicrotask(() => setState(null));
      return;
    }
    queueMicrotask(() => setState(getMutationState(id) ?? null));
    const unsub = onMutationStateChange(() => {
      setState(getMutationState(id) ?? null);
    });
    return unsub;
  }, [id]);

  return state;
}
