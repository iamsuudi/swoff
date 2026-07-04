import { ref } from "vue";
import { resetSwoff } from "../reset";
import type { ResetSwoffOptions } from "../reset";

interface UseSwoffResetResult {
  reset: (options?: ResetSwoffOptions) => Promise<void>;
  isResetting: boolean;
  error: Error | null;
}

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
export function useSwoffReset(): UseSwoffResetResult {
  const isResetting = ref(false);
  const error = ref<Error | null>(null);

  async function reset(options?: ResetSwoffOptions) {
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
