import type { RuntimeContext } from "./utils.js";
import { R, T } from "./utils.js";

export function generateOnlineStatusCode(ctx: RuntimeContext): string {
  const { ts } = ctx;
  return `/**
 * Online Status — shared online/offline primitive.
 *
 * Consumed by the connectivity feature (heartbeat/verification) and the
 * auth feature (auth/state), so a single source of truth drives both.
 * Generated when either \`connectivity.enabled\` or \`auth.enabled\` is on.
 *
 * Public API:
 *   CONNECTIVITY_EVENT     — window event name dispatched on status change
 *   getCurrentOnlineStatus — latest known online status (navigator.onLine initially)
 *   dispatchState          — publish a status change to listeners
 */

export const CONNECTIVITY_EVENT = 'app-connectivity-change'

let _currentOnlineStatus${T(ts, "boolean")} = typeof navigator !== "undefined" ? navigator.onLine : true

export function getCurrentOnlineStatus()${R(ts, "boolean")}{
  return _currentOnlineStatus
}

export function dispatchState(isTrulyOnline${T(ts, "boolean")}) {
  _currentOnlineStatus = isTrulyOnline
  const event = new CustomEvent(CONNECTIVITY_EVENT, {
    detail: { online: isTrulyOnline },
  })
  window.dispatchEvent(event)
}
`;
}