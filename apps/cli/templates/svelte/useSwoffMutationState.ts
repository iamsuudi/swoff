import { writable } from "svelte/store";
import { onMount } from "svelte";
import { getMutationState, onMutationStateChange } from "../mutation/state";
import type { MutationState } from "../mutation/state";

export function useSwoffMutationState(id: string | null) {
  const state = writable<MutationState | null>(null);

  function update() {
    state.set(id ? (getMutationState(id) ?? null) : null);
  }

  onMount(update);

  let cleanup: (() => void) | undefined;

  onMount(() => {
    const unsub = onMutationStateChange(update);
    if (typeof unsub === "function") {
      cleanup = unsub;
    }
    return () => {
      cleanup?.();
    };
  });

  return state;
}
