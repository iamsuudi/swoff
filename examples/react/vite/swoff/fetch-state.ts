/**
 * Swoff Fetch State
 * Global in-flight fetch counter. Incremented by fetchWithCache and used by
 * useIsFetching for a reactive global loading indicator.
 *
 * Usage:
 *   import { incrementFetchCount, decrementFetchCount, getFetchCount } from './swoff/fetch-state.ts';
 *
 *   // Manual tracking (if you bypass fetchWithCache):
 *   incrementFetchCount();
 *   // ... fetch ...
 *   decrementFetchCount();
 *
 * Custom event:
 *   fetch-count-changed  — dispatched on every increment/decrement
 *                          detail: { count: number }
 */

let _fetchCount = 0;

/** Increment the global fetch counter. Dispatches fetch-count-changed. */
export function incrementFetchCount(): void {
  _fetchCount++;
  window.dispatchEvent(new CustomEvent("fetch-count-changed", { detail: { count: _fetchCount } }));
}

/** Decrement the global fetch counter. Dispatches fetch-count-changed. Never goes below 0. */
export function decrementFetchCount(): void {
  _fetchCount = Math.max(0, _fetchCount - 1);
  window.dispatchEvent(new CustomEvent("fetch-count-changed", { detail: { count: _fetchCount } }));
}

/** Synchronously get the current fetch count. */
export function getFetchCount(): number {
  return _fetchCount;
}
