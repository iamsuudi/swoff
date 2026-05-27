/**
 * Generates the SW push event connection handler.
 * Opens an SSE (fetch+stream) or WebSocket connection from the SW,
 * listens for "invalidate" events, and calls invalidateByTag().
 */

export function generateServerPushHandler(
  type: "sse" | "websocket",
  endpoint: string,
  reconnectDelayMs: number,
): string {
  if (type === "websocket") {
    return `
// --- Server Push Events (WebSocket) ---

let pushWs = null;
let pushReconnectTimer = null;

async function connectPushEvents() {
  try {
    pushWs = new WebSocket("${endpoint}");
    pushWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "invalidate" && data.tags) {
          data.tags.forEach((tag) => invalidateByTag(tag));
        }
      } catch {}
    };
    pushWs.onclose = () => {
      pushWs = null;
      scheduleReconnect();
    };
    pushWs.onerror = () => {
      pushWs?.close();
    };
  } catch {
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (pushReconnectTimer) clearTimeout(pushReconnectTimer);
  pushReconnectTimer = setTimeout(connectPushEvents, ${reconnectDelayMs});
}

self.addEventListener("activate", (event) => {
  event.waitUntil(connectPushEvents());
});
`;
  }

  // SSE: fetch + ReadableStream reader
  return `
// --- Server Push Events (SSE) ---

let pushReconnectTimer = null;
let pushAbortController = null;

async function connectPushEvents() {
  try {
    pushAbortController = new AbortController();
    const response = await fetch("${endpoint}", {
      headers: { Accept: "text/event-stream" },
      signal: pushAbortController.signal,
    });
    if (!response.ok || !response.body) {
      scheduleReconnect();
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventType = "";
    let dataStr = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          dataStr = line.slice(6);
        } else if (line === "") {
          if (eventType === "invalidate" && dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.tags) {
                parsed.tags.forEach((tag) => invalidateByTag(tag));
              }
            } catch {}
          }
          eventType = "";
          dataStr = "";
        }
      }
    }
  } catch {
    // Connection lost or aborted
  }
  scheduleReconnect();
}

function scheduleReconnect() {
  if (pushReconnectTimer) clearTimeout(pushReconnectTimer);
  pushReconnectTimer = setTimeout(connectPushEvents, ${reconnectDelayMs});
}

self.addEventListener("activate", (event) => {
  event.waitUntil(connectPushEvents());
});
`;
}
