import { writable } from "svelte/store";
import { resetSwoff } from "../reset";
import type { ResetSwoffOptions } from "../reset";

interface UseSwoffResetResult {
  reset: (options?: ResetSwoffOptions) => Promise<void>;
  isResetting: boolean;
  error: Error | null;
}

export function useSwoffReset(): UseSwoffResetResult {
  const isResetting = writable(false);
  const error = writable<Error | null>(null);

  async function reset(options?: ResetSwoffOptions) {
    isResetting.set(true);
    error.set(null);
    try {
      await resetSwoff(options);
    } catch (e) {
      error.set(e instanceof Error ? e : new Error(String(e)));
    } finally {
      isResetting.set(false);
    }
  }

  return {
    reset,
    isResetting: isResetting,
    error: error,
  };
}
