import { writable } from "svelte/store";
import { resetSwoff } from "../reset.js";

export function useSwoffReset() {
  const isResetting = writable(false);
  const error = writable(null);

  async function reset(options) {
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

  return { reset, isResetting, error };
}
