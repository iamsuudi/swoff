import { useState, useEffect } from "react";
import { getMutationState, onMutationStateChange } from "../mutation-state.js";

export function useMutationState(id) {
  const [state, setState] = useState(() =>
    id ? getMutationState(id) ?? null : null,
  );

  useEffect(() => {
    if (!id) {
      setState(null);
      return;
    }

    setState(getMutationState(id) ?? null);

    const unsub = onMutationStateChange((updated) => {
      if (updated.id === id) {
        setState(updated);
      }
    });

    return unsub;
  }, [id]);

  return state;
}
