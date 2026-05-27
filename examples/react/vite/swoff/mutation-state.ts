/**
 * Swoff Mutation State
 * Lightweight in-memory mutation state tracker.
 * Enables per-mutation status UI (loading spinners, error states, success indicators).
 *
 * Usage:
 *   import { trackMutation, getMutationState, clearMutationState } from './swoff/mutation-state.ts';
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
  id: string;
  status: MutationStatus;
  error: Error | null;
  data: unknown;
  timestamp: number;
}

const mutations = new Map<string, MutationState>();

let listenerId = 0;
const listeners = new Map<number, (state: MutationState) => void>();

/** Track a mutation with the given ID and initial status. */
export function trackMutation(id: string, status: MutationStatus = "idle"): MutationState{
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
export function updateMutationState(id: string, partial: Partial<MutationState>): MutationState | null{
  const state = mutations.get(id);
  if (!state) return null;
  Object.assign(state, partial);
  state.timestamp = Date.now();
  notifyListeners(state);
  window.dispatchEvent(new CustomEvent("mutation-state-changed", { detail: state }));
  return state;
}

/** Mark a mutation as successful with optional data. */
export function resolveMutation(id: string, data: unknown = null): void{
  updateMutationState(id, { status: "success", data, error: null });
}

/** Mark a mutation as failed with an error. */
export function rejectMutation(id: string, error: Error): void{
  updateMutationState(id, { status: "error", error });
}

/** Get the current state of a mutation by ID. */
export function getMutationState(id: string): MutationState | undefined{
  return mutations.get(id);
}

/** Remove a mutation's state from the tracker. */
export function clearMutationState(id: string): void{
  mutations.delete(id);
}

/** Get all tracked mutations. */
export function getAllMutationStates(): MutationState[]{
  return Array.from(mutations.values());
}

/** Get the count of mutations in a given status. */
export function getMutationCount(status: MutationStatus): number{
  let count = 0;
  for (const state of mutations.values()) {
    if (state.status === status) count++;
  }
  return count;
}

/** Subscribe to mutation state changes. Returns an unsubscribe function. */
export function onMutationStateChange(callback: (state: MutationState) => void): () => void{
  const id = ++listenerId;
  listeners.set(id, callback);
  return () => { listeners.delete(id); };
}

function notifyListeners(state: MutationState): void{
  for (const cb of listeners.values()) {
    try {
      cb(state);
    } catch {
      // Handle listener errors silently
    }
  }
}
