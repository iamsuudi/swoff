import { ref, onMounted, onUnmounted } from "vue";
import { getMutationState, onMutationStateChange } from "../mutation/state";
import type { MutationState } from "../mutation/state";

/**
 * Composable that subscribes to a specific mutation's state changes.
 * Useful for showing per-mutation loading spinners, error states, etc.
 *
 * Usage:
 *   const mutation = useSwoffMutationState(mutationId);
 *   <div v-if="mutation?.status === 'error'">{{ mutation?.error?.message }}</div>
 */
export function useSwoffMutationState(id: string | null) {
  const state = ref<MutationState | null>(null);

  function update() {
    state.value = id ? (getMutationState(id) ?? null) : null;
  }

  onMounted(update);

  let cleanup: (() => void) | undefined;

  onMounted(() => {
    const unsub = onMutationStateChange(update);
    if (typeof unsub === "function") {
      cleanup = unsub;
    }

    onUnmounted(() => {
      cleanup?.();
    });
  });

  return state;
}
