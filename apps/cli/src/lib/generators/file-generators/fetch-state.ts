import { GeneratorContext, writeFile } from "./context.js";

export function generateFetchState(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");

  const code = `/**
 * Swoff Fetch State
 * Global in-flight fetch counter. Incremented by fetchWithCache and used by
 * useIsFetching for a reactive global loading indicator.
 *
 * Usage:
 *   import { incrementFetchCount, decrementFetchCount, getFetchCount } from './swoff/fetch-state.${ext}';
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
export function incrementFetchCount()${R("void")}{
  _fetchCount++;
  window.dispatchEvent(new CustomEvent("fetch-count-changed", { detail: { count: _fetchCount } }));
}

/** Decrement the global fetch counter. Dispatches fetch-count-changed. Never goes below 0. */
export function decrementFetchCount()${R("void")}{
  _fetchCount = Math.max(0, _fetchCount - 1);
  window.dispatchEvent(new CustomEvent("fetch-count-changed", { detail: { count: _fetchCount } }));
}

/** Synchronously get the current fetch count. */
export function getFetchCount()${R("number")}{
  return _fetchCount;
}
`;

  writeFile(ctx, `fetch-state.${ext}`, code);
}
