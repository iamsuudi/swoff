import { ref } from "vue";
import { resetSwoff } from "../reset.js";

/**
 * Composable exposing swoff's nuclear reset with reactive state.
 *
 * Usage:
 *   const { reset, isResetting, error } = useSwoffReset();
 *
 *   <button @click="reset()" :disabled="isResetting">
 *     {{ isResetting ? "Resetting..." : "Reset Swoff" }}
 *   </button>
 *   <p v-if="error" style="color: red">{{ error.message }}</p>
 */
export function useSwoffReset() {
  const isResetting = ref(false);
  const error = ref(null);

  async function reset(options) {
    isResetting.value = true;
    error.value = null;
    try {
      await resetSwoff(options);
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
    } finally {
      isResetting.value = false;
    }
  }

  return { reset, isResetting: isResetting.value, error: error.value };
}
