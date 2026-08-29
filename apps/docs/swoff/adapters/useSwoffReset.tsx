import { useState, useCallback } from "react";
import { resetSwoff } from "../reset.ts";
import type { ResetSwoffOptions } from "../reset.ts";

interface UseSwoffResetResult {
  reset: (options?: ResetSwoffOptions) => Promise<void>;
  isResetting: boolean;
  error: Error | null;
}

/**
 * Hook exposing swoff's nuclear reset with reactive state.
 *
 * Usage:
 *   const { reset, isResetting, error } = useSwoffReset();
 *
 *   <button onClick={() => reset()} disabled={isResetting}>
 *     {isResetting ? "Resetting..." : "Reset Swoff"}
 *   </button>
 *   {error && <p style={{ color: "red" }}>{error.message}</p>}
 */
export function useSwoffReset(): UseSwoffResetResult {
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(async (options?: ResetSwoffOptions) => {
    setIsResetting(true);
    setError(null);
    try {
      await resetSwoff(options);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsResetting(false);
    }
  }, []);

  return { reset, isResetting, error };
}
