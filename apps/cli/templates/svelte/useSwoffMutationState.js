import { writable } from "svelte/store";
import { onMount } from "svelte";
import { getMutationState, onMutationStateChange } from "../mutation/state.js";

export function useSwoffMutationState(id) {
  const state = writable(null);

  function update() {
    state.set(id ? (getMutationState(id) ?? null) : null);
  }

  onMount(update);

  let cleanup;

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
