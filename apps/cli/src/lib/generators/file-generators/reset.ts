import { GeneratorContext, writeFile } from "./context.js";

export function generateReset(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");

  const code = `/**
 * Swoff Reset
 * Nuclear option: wipe all swoff data (caches, IndexedDB, localStorage),
 * unregister the service worker, then re-register from scratch.
 *
 * Usage:
 *   import { resetSwoff } from './swoff/reset.${ext}';
 *
 *   // Full reset (default)
 *   const result = await resetSwoff();
 *   console.log(result.unregistered, result.reregistered, result.warnings);
 *
 *   // Selective reset — keep caches but reset IDB + SW
 *   await resetSwoff({ clearCache: false });
 *
 * Events dispatched:
 *   swoff:reset-start    — before any cleanup begins
 *   swoff:reset-complete — after everything finishes (detail: { unregistered, reregistered, warnings })
 */

import { initServiceWorker } from "./sw/injector.${ext}";

export interface ResetSwoffOptions {
  /** Clear all Cache Storage caches (default: true) */
  clearCache${T("boolean")};
  /** Delete all swoff-* IndexedDB databases (default: true) */
  clearIdb${T("boolean")};
  /** Clear localStorage keys like swRegisteredVersion (default: true) */
  clearStorage${T("boolean")};
  /** Unregister SW then re-register (default: true) */
  unregisterSW${T("boolean")};
  /** Re-register SW after unregistering (default: true) */
  reRegister${T("boolean")};
}

const DEFAULT_OPTIONS: ResetSwoffOptions = {
  clearCache: true,
  clearIdb: true,
  clearStorage: true,
  unregisterSW: true,
  reRegister: true,
};

const KNOWN_DB_NAMES = [
  "swoff-auth",
  "swoff-auth-user",
  "swoff-queue",
  "swoff-cache-tags",
  "swoff-push",
];

/** Delete all known swoff-* IndexedDB databases. Also tries indexedDB.databases() API to catch any unknown swoff-* databases. */
async function deleteSwoffDatabases(warnings${T("string[]")})${R("Promise<void>")}{
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

/** Nuclear reset: wipes all swoff-persisted data, unregisters the SW, then re-registers from scratch. Returns detailed results. */
export async function resetSwoff(opts${T("Partial<ResetSwoffOptions>" )} = {})${R("Promise<{ unregistered: boolean; reregistered: boolean; warnings: string[] }>")}{
  const options${T("ResetSwoffOptions")} = { ...DEFAULT_OPTIONS, ...opts };
  const warnings${T("string[]")} = [];

  window.dispatchEvent(new CustomEvent("swoff:reset-start"));

  // 1. Clear Cache Storage
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

  // 4. Unregister SW
  let unregistered = false;
  if (options.unregisterSW) {
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          unregistered = await reg.unregister();
        }
      }
    } catch (e) {
      warnings.push(\`Failed to unregister SW: \${e}\`);
    }

    // Always clear the version marker before re-registering so initServiceWorker
    // detects a fresh install rather than trying to reuse a stale registration
    try {
      localStorage.removeItem("swRegisteredVersion");
    } catch { /* ignore */ }
  }

  // 5. Re-register SW
  let reregistered = false;
  if (options.unregisterSW) {
    try {
      await initServiceWorker();
      reregistered = true;
    } catch (e) {
      warnings.push(\`Failed to re-register SW: \${e}\`);
    }
  }

  const result = { unregistered, reregistered, warnings };
  window.dispatchEvent(new CustomEvent("swoff:reset-complete", { detail: result }));
  return result;
}
`;

  writeFile(ctx, `reset.${ext}`, code);
}
