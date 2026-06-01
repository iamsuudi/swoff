/**
 * Swoff Server Push Events
 *
 * The service worker connects to /api/events and invalidates cache tags
 * when the server sends "invalidate" events — no polling needed.
 * This client-side helper provides status tracking and a manual start/stop API.
 *
 * Usage:
 *   import { startPushEvents, stopPushEvents, isPushConnected } from "./server-push.ts";
 *   startPushEvents();
 *
 * Server sends:
 *   event: invalidate
 *   data: {"tags": ["todos", "todo:42"]}
 */

import { API_BASE } from "./config.ts";

type PushEventOptions= {
  signal: AbortSignal;
};

let active: boolean = false;
let swConnected: boolean = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function handleInvalidation(tags: string[]): void{
  // Forward to SW for cache invalidation
  if (navigator.serviceWorker.controller) {
    for (const tag of tags) {
      navigator.serviceWorker.controller.postMessage({ type: "INVALIDATE_TAG", tag });
    }
  }
  window.dispatchEvent(new CustomEvent("cache-invalidated", { detail: { tags } }));
}

function notifyStatus(connected: boolean): void{
  window.dispatchEvent(new CustomEvent("push-events-status", { detail: { connected } }));
}

// Listen for SSE status from the SW
if (typeof navigator !== "undefined" && navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "SSE_STATUS") {
      swConnected = event.data.connected;
      notifyStatus(swConnected);
    }
  });
}

async function connect(options: PushEventOptions = {} as PushEventOptions): Promise<void>{
  
  return new Promise((resolve) => {
    fetch(API_BASE + "/api/events", {
      headers: { Accept: "text/event-stream" },
      credentials: "include",
      signal: options.signal,
    }).then(async (response) => {
      if (!response.ok || !response.body) { resolve(); return; }
      notifyStatus(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "";
      let dataStr = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ")) dataStr = line.slice(6);
          else if (line === "" && eventType === "invalidate" && dataStr) {
            try {
              const p = JSON.parse(dataStr); if (p.tags) handleInvalidation(p.tags);
            } catch {
              // Handle invalidation data
            }
            eventType = ""; dataStr = "";
          }
        }
      }
    }).catch(() => {}).finally(() => {
      notifyStatus(false);
      resolve();
    });
  });
}

/** Start listening for server push events. Only connects when the SW is not active — the SW is the primary connection manager. Retries on connection loss with exponential backoff. */
export async function startPushEvents(){
  if (active) return;

  // If SW is already controlling the page, skip client-side connection — the SW handles push events.
  if (navigator.serviceWorker.controller) return;

  // Listen for SW activation — if SW takes over, disconnect the client fallback.
  const onControllerChange = () => { stopPushEvents(); };
  navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

  active = true;
  let delay = 5000;
  while (active) {
    await connect();
    if (!active) break;
    await new Promise((r) => { reconnectTimer = setTimeout(r, delay); });
    delay = Math.min(delay * 1.5, 30000); // cap at 30s
  }

  navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
}

/** Stop listening for push events. */
export function stopPushEvents(){
  active = false;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

/** Check if the push connection is currently established. */
export function isPushConnected(){
  return active || swConnected;
}
