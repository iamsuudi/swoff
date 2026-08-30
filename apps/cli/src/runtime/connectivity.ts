import type { RuntimeContext } from "./utils.js";
import { T } from "./utils.js";

export function generateConnectivityCode(ctx: RuntimeContext): string {
  const { ext, ts } = ctx;
  return `/**
 * Connectivity — verified online/offline detection with a periodic heartbeat.
 *
 * Depends on the shared online/offline primitive in ./online-status.${ext}
 * (single source of truth also used by auth/state). Re-exports the primitive's
 * public surface for convenience.
 *
 * Public API:
 *   CONNECTIVITY_EVENT      — (re-exported) window event name for status changes
 *   getCurrentOnlineStatus  — (re-exported) latest known online status
 *   dispatchState           — (re-exported) publish a status change to listeners
 *   verifyAndNotify         — HEAD-verify connectivity, dispatch + notify SW
 *   startHeartbeat          — start periodic verification while visible
 *   stopHeartbeat           — stop periodic verification
 *   forceRetry              — stop heartbeat, verify once, restart
 */

import { dispatchState, getCurrentOnlineStatus } from "./online-status.${ext}";
export { CONNECTIVITY_EVENT, dispatchState, getCurrentOnlineStatus } from "./online-status.${ext}";

let heartbeatIntervalId${T(ts, "ReturnType<typeof setInterval> | null")} = null
const HEARTBEAT_DELAY = 30000

function createTimeoutSignal(ms) {
  if (typeof AbortSignal.timeout === "function") return AbortSignal.timeout(ms);
  var ctrl = new AbortController();
  setTimeout(function() { ctrl.abort(); }, ms);
  return ctrl.signal;
}

export async function verifyAndNotify() {
  if (typeof window === 'undefined') return false

  if (!navigator.onLine) {
    dispatchState(false)
    return false
  }

  try {
    await fetch(\`/\${Date.now()}?hb=1\`, {
      method: 'HEAD',
      cache: 'no-cache',
      signal: createTimeoutSignal(5000),
    })

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'ONLINE' })
    }

    dispatchState(true)
    return true
  } catch (error) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'OFFLINE' })
    }
    dispatchState(false)
    return false
  }
}

export function startHeartbeat() {
  if (heartbeatIntervalId) return
  heartbeatIntervalId = setInterval(async () => {
    if (document.hidden) return
    await verifyAndNotify()
  }, HEARTBEAT_DELAY)
}

export function stopHeartbeat() {
  if (!heartbeatIntervalId) return
  clearInterval(heartbeatIntervalId)
  heartbeatIntervalId = null
}

export async function forceRetry() {
  stopHeartbeat()
  await verifyAndNotify()
  startHeartbeat()
}
`;
}