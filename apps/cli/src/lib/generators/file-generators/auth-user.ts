/**
 * Generates auth-user.ts/js — fetch, cache, and invalidate current user.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateAuthUser(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");
  const PT = (type: string) => (ts ? `<${type}>` : "");
  const AS = (type: string) => (ts ? ` as ${type}` : "");
  const userEndpoint = ctx.config.features.auth.userEndpoint;

  const code = `/**
 * Current User — fetch, cache, and invalidate the current user for offline access.
 *
 * Usage:
 *   import { fetchCurrentUser, cacheUser, getCachedUser, clearCachedUser } from "./auth/user.${ext}";
 *
 *   await fetchCurrentUser();           // Fetch from server & cache
 *   const user = await getCachedUser(); // Get cached (offline-capable)
 *   await clearCachedUser();            // Clear on logout
 */

import { authenticatedFetch } from "./fetch.${ext}";

const DB_NAME = "swoff-auth-user";
const STORE_NAME = "current-user";

function openAuthDB()${R("Promise<IDBDatabase>")}{
  return new Promise${PT("IDBDatabase")}((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target${AS("IDBOpenDBRequest")}).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = (e) => resolve((e.target${AS("IDBOpenDBRequest")}).result);
    request.onerror = (e) => reject((e.target${AS("IDBRequest")}).error);
  });
}

/** Fetch current user from the user endpoint and cache the result in IndexedDB. */
export async function fetchCurrentUser()${R("Promise<Record<string, unknown>>")}{
  const response = await authenticatedFetch("${userEndpoint}");
  if (!response.ok) throw new Error("Failed to fetch user");

  const user = await response.json();
  await cacheUser(user);
  return user;
}

/** Persist user data to IndexedDB for offline access. */
export async function cacheUser(user${T("Record<string, unknown>")})${R("Promise<void>")}{
  const db = await openAuthDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ key: "user", value: user });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load user data from IndexedDB cache (no token — only user object survives refresh). */
export async function getCachedUser()${R("Promise<Record<string, unknown> | null>")}{
  const db = await openAuthDB();
  return new Promise${PT("Record<string, unknown> | null")}((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("user");
    request.onsuccess = () => resolve((request${AS("IDBRequest")}).result?.value ?? null);
    request.onerror = () => reject((request${AS("IDBRequest")}).error);
  });
}

/** Remove user data from IndexedDB cache. Call on logout. */
export async function clearCachedUser()${R("Promise<void>")}{
  const db = await openAuthDB();
  return new Promise${PT("void")}((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete("user");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject((tx${AS("IDBTransaction")}).error);
  });
}
`;

  writeFile(ctx, `auth/user.${ext}`, code);
}
