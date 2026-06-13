import type { RuntimeContext } from "./utils.js";
import { T } from "./utils.js";

export function generateConnectivityManagerCode(ctx: RuntimeContext): string {
  const { ts } = ctx;
  return `/**
  **/
export const CONNECTIVITY_EVENT = 'app-connectivity-change'

let heartbeatIntervalId${T(ts, "ReturnType<typeof setInterval> | null")} = null
const HEARTBEAT_DELAY = 30000

let _currentOnlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true

export function getCurrentOnlineStatus(): boolean {
  return _currentOnlineStatus
}

export async function verifyAndNotify() {
  if (typeof window === 'undefined') return false

  if (!navigator.onLine) {
    dispatchState(false)
    return false
  }

  try {
    await fetch(\`https://google.com?t=\${Date.now()}\`, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000),
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

export function dispatchState(isTrulyOnline: boolean) {
  _currentOnlineStatus = isTrulyOnline
  const event = new CustomEvent(CONNECTIVITY_EVENT, {
    detail: { online: isTrulyOnline },
  })
  window.dispatchEvent(event)
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
