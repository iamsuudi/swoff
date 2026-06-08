/**
 * Generates server-push.ts/js — client-side connection manager for SSE/WebSocket.
 * The SW connects to the push endpoint directly in modern browsers.
 * This client-side helper provides a fallback and status events for the UI.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { generateServerPushCode } from "../../../runtime/server-push.js";

export function generateServerPush(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const sp = ctx.config.features.realtime.serverPush;

  const code = generateServerPushCode(
    { ts, ext },
    sp.type,
    sp.endpoint,
    sp.reconnectDelayMs,
  );

  writeFile(ctx, `realtime/server-push.${ext}`, code);
}
