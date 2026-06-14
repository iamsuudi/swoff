import type { RuntimeContext } from "./utils.js";
import { T, O, R } from "./utils.js";

export function generateResetCode(ctx: RuntimeContext): string {
  const { ext, ts } = ctx;
  return `/**
 * Swoff Reset
 * Nuclear option: wipe all swoff data (caches, IndexedDB, localStorage),
 * then instruct the service worker to clear and re-precache all assets.
 *
 * Unlike the old approach of unregister + re-register (which often failed to
 * trigger the install event for byte-identical scripts), this sends a
 * RESET_CACHE message to the active SW, which handles cache clearing and
 * re-precaching internally.
 *
 * Usage:
 *   import { resetSwoff } from './swoff/reset.${ext}';
 *
 *   // Full reset (default)
 *   const result = await resetSwoff();
 *   console.log(result.warnings);
 *
 *   // Selective reset — keep caches but reset IDB + SW
 *   await resetSwoff({ clearCache: false });
 *
 * Events dispatched:
 *   swoff:reset-start    — before any cleanup begins
 *   swoff:reset-complete — after everything finishes (detail: { warnings })
 */

export interface ResetSwoffOptions {
  /** Clear all Cache Storage caches (default: true) */
  clearCache${O(ts, "boolean")};
  /** Delete all swoff-* IndexedDB databases (default: true) */
  clearIdb${O(ts, "boolean")};
  /** Clear localStorage keys like swRegisteredVersion (default: true) */
  clearStorage${O(ts, "boolean")};
  /** Reset SW caches (clear + re-precache) (default: true) */
  resetSwCache${O(ts, "boolean")};
}

const DEFAULT_OPTIONS: ResetSwoffOptions = {
  clearCache: true,
  clearIdb: true,
  clearStorage: true,
  resetSwCache: true,
};

const KNOWN_DB_NAMES = [
  "swoff-auth",
  "swoff-queue",
  "swoff-cache-tags",
  "swoff-push",
];

/** Delete all known swoff-* IndexedDB databases. Also tries indexedDB.databases() API to catch any unknown swoff-* databases. */
async function deleteSwoffDatabases(warnings${T(ts, "string[]")})${R(ts, "Promise<void>")}{
  const dbNames = [...KNOWN_DB_NAMES];

  // Use the modern databases() API if available to catch unknown swoff-* DBs
  try {
    const allDbs = await indexedDB.databases?.();
    if (allDbs) {
      for (const db of allDbs) {
        if (db.name && db.name.startsWith("swoff-") && !dbNames.includes(db.name)) {
          dbNames.push(db.name);
        }
      }
    }
  } catch { /* not supported — use known list */ }

  for (const name of dbNames) {
    try {
      indexedDB.deleteDatabase(name);
    } catch (e) {
      warnings.push(\`Failed to delete database "\${name}": \${e}\`);
    }
  }
}

/** Nuclear reset: wipes all swoff-persisted data and resets the SW cache. Returns detailed results. */
export async function resetSwoff(opts${T(ts, "ResetSwoffOptions")} = {})${R(ts, "Promise<{ warnings: string[] }>")}{
  const options${T(ts, "ResetSwoffOptions")} = { ...DEFAULT_OPTIONS, ...opts };
  const warnings${T(ts, "string[]")} = [];

  window.dispatchEvent(new CustomEvent("swoff:reset-start"));

  // 1. Clear Cache Storage (belt-and-suspenders — SW also clears them)
  if (options.clearCache) {
    try {
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {
      warnings.push(\`Failed to clear caches: \${e}\`);
    }
  }

  // 2. Delete IndexedDB databases
  if (options.clearIdb) {
    await deleteSwoffDatabases(warnings);
  }

  // 3. Clear localStorage
  if (options.clearStorage) {
    try {
      localStorage.removeItem("swRegisteredVersion");
    } catch (e) {
      warnings.push(\`Failed to clear localStorage: \${e}\`);
    }
  }

  // 4. Tell the SW to clear its caches and re-precache all assets
  if (options.resetSwCache) {
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          await new Promise<void>((resolve) => {
            const channel = new MessageChannel();
            channel.port1.onmessage = (event) => {
              if (event.data.type === "RESET_CACHE_COMPLETE") {
                resolve();
              }
            };
            registration.active?.postMessage({ type: "RESET_CACHE" }, [channel.port2]);
          });
        }
      }
    } catch (e) {
      warnings.push(\`Failed to reset SW cache: \${e}\`);
    }
  }

  const result = { warnings };
  window.dispatchEvent(new CustomEvent("swoff:reset-complete", { detail: result }));
  return result;
}
`;
}
