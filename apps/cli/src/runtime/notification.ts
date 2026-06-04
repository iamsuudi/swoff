import type { RuntimeContext } from "./utils.js";
import { T, R } from "./utils.js";

export function generateNotificationCode(ctx: RuntimeContext): string {
  const { ext, ts } = ctx;
  return `/**
 * Swoff Notification
 * Dispatches \`swoff:notification\` custom events so your app can
 * show toast/alert UI for offline-first events (fetch failures,
 * storage quota warnings, background sync errors, etc.).
 *
 * Usage:
 *   import { checkStorage } from "./swoff/notification.${ext}";
 *   const { usage, quota, percentUsed } = await checkStorage();
 *
 * Window events:
 *   swoff:notification  — dispatched by the service worker or by checkStorage()
 *                         detail: { level: "error"|"warn"|"info", code: string, message: string }
 *
 * ── Placeholder listener ────────────────────────────────
 * Add a listener in your app entry point and replace the body
 * with your own toast library (e.g. react-hot-toast, vue-toastification):
 *
 *   window.addEventListener("swoff:notification", (event) => {
 *     const { level, code, message } = event.detail;
 *     // console.log(\`[swoff:\${level}] \${code}: \${message}\`);
 *     // alert(\`\${code}: \${message}\`);
 *   });
 */

/** Get raw storage estimate without dispatching events. Reuse in your own UI. */
export async function getStorageEstimate()${R(ts, "Promise<{ usage: number; quota: number; percentUsed: number }>")}{
  if (!navigator.storage?.estimate) {
    return { usage: 0, quota: 0, percentUsed: 0 };
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  const percentUsed = quota > 0 ? Math.round((usage / quota) * 100) : 0;
  return { usage, quota, percentUsed };
}

/** Check available storage and dispatch a warning if >80% used. */
export async function checkStorage()${R(ts, "Promise<{ usage: number; quota: number; percentUsed: number }>")}{
  const result = await getStorageEstimate();
  if (result.percentUsed > 80) {
    window.dispatchEvent(
      new CustomEvent("swoff:notification", {
        detail: {
          level: "warn",
          code: "STORAGE_QUOTA_HIGH",
          message: \`Storage at \${result.percentUsed}% capacity (\${formatBytes(result.usage)} / \${formatBytes(result.quota)})\`,
        },
      }),
    );
  }
  return result;
}

/** Format bytes to a human-readable string (e.g. "1.5 MB"). */
export function formatBytes(bytes${T(ts, "number")})${R(ts, "string")}{
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return \`\${(bytes / Math.pow(1024, i)).toFixed(1)} \${units[i]}\`;
}
`;
}
