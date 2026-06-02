import type { RuntimeContext } from "./utils.js";
import { T, R } from "./utils.js";

export function generateMutationStateCode(ctx: RuntimeContext): string {
  const { ext, ts } = ctx;
  return `/**
 * Swoff Mutation State
 * Lightweight in-memory mutation state tracker.
 * Enables per-mutation status UI (loading spinners, error states, success indicators).
 *
 * Usage:
 *   import { trackMutation, getMutationState, clearMutationState } from './swoff/mutation-state.${ext}';
 *
 *   // After queueing a mutation
 *   const id = "mutation-" + crypto.randomUUID();
 *   trackMutation(id, "pending");
 *
 *   // Check state later
 *   const state = getMutationState(id);
 *   if (state?.status === "error") { showError(state.error); }
 *
 *   // Clear when done
 *   clearMutationState(id);
 */

export type MutationStatus = "idle" | "pending" | "success" | "error";

export interface MutationState {
  id${T(ts, "string")};
  status${T(ts, "MutationStatus")};
  error${T(ts, "Error | null")};
  data${T(ts, "unknown")};
  timestamp${T(ts, "number")};
}

const mutations = new Map<string, MutationState>();

let listenerId = 0;
const listeners = new Map<number, (state: MutationState) => void>();

/** Track a mutation with the given ID and initial status. */
export function trackMutation(id${T(ts, "string")}, status${T(ts, "MutationStatus")} = "idle")${R(ts, "MutationState")}{
  let state = mutations.get(id);
  if (!state) {
    state = { id, status, error: null, data: null, timestamp: Date.now() };
    mutations.set(id, state);
  } else {
    state.status = status;
    state.timestamp = Date.now();
  }
  notifyListeners(state);
  window.dispatchEvent(new CustomEvent("mutation-state-changed", { detail: state }));
  return state;
}

/** Update an existing mutation's state. */
export function updateMutationState(id${T(ts, "string")}, partial${T(ts, "Partial<MutationState>")})${R(ts, "MutationState | null")}{
  const state = mutations.get(id);
  if (!state) return null;
  Object.assign(state, partial);
  state.timestamp = Date.now();
  notifyListeners(state);
  window.dispatchEvent(new CustomEvent("mutation-state-changed", { detail: state }));
  return state;
}

/** Mark a mutation as successful with optional data. */
export function resolveMutation(id${T(ts, "string")}, data${T(ts, "unknown")} = null)${R(ts, "void")}{
  updateMutationState(id, { status: "success", data, error: null });
}

/** Mark a mutation as failed with an error. */
export function rejectMutation(id${T(ts, "string")}, error${T(ts, "Error")})${R(ts, "void")}{
  updateMutationState(id, { status: "error", error });
}

/** Get the current state of a mutation by ID. */
export function getMutationState(id${T(ts, "string")})${R(ts, "MutationState | undefined")}{
  return mutations.get(id);
}

/** Remove a mutation's state from the tracker. */
export function clearMutationState(id${T(ts, "string")})${R(ts, "void")}{
  mutations.delete(id);
}

/** Get all tracked mutations. */
export function getAllMutationStates()${R(ts, "MutationState[]")}{
  return Array.from(mutations.values());
}

/** Get the count of mutations in a given status. */
export function getMutationCount(status${T(ts, "MutationStatus")})${R(ts, "number")}{
  let count = 0;
  for (const state of mutations.values()) {
    if (state.status === status) count++;
  }
  return count;
}

/** Subscribe to mutation state changes. Returns an unsubscribe function. */
export function onMutationStateChange(callback${T(ts, "(state: MutationState) => void")})${R(ts, "() => void")}{
  const id = ++listenerId;
  listeners.set(id, callback);
  return () => { listeners.delete(id); };
}

function notifyListeners(state${T(ts, "MutationState")})${R(ts, "void")}{
  for (const cb of listeners.values()) {
    try {
      cb(state);
    } catch {
      // Handle listener errors silently
    }
  }
}
`;
}
