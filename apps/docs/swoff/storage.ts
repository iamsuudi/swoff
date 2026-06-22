/**
 * Swoff Storage
 * Pure utility functions for storage estimation and formatting.
 *
 * Usage:
 *   import { getStorageEstimate, formatBytes } from "./swoff/storage.ts";
 *   const { usage, quota, percentUsed } = await getStorageEstimate();
 */

/** Get raw storage estimate. */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number; percentUsed: number }> {
  if (!navigator.storage?.estimate) {
    return { usage: 0, quota: 0, percentUsed: 0 };
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  const percentUsed = quota > 0 ? Math.round((usage / quota) * 100) : 0;
  return { usage, quota, percentUsed };
}

/** Format bytes to a human-readable string (e.g. "1.5 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
