/**
 * Current User — fetch, cache, and invalidate the current user for offline access.
 *
 * Usage:
 *   import { fetchCurrentUser, cacheUser, getCachedUser, clearCachedUser } from "./auth/user.ts";
 *
 *   await fetchCurrentUser();           // Fetch from server & cache
 *   const user = await getCachedUser(); // Get cached (offline-capable)
 *   await clearCachedUser();            // Clear on logout
 */

import { fetchWithCache } from "../fetch-wrapper.ts";

const DB_NAME = "swoff-auth-user";
const STORE_NAME = "current-user";

function openAuthDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

/** Fetch current user from the user endpoint and cache the result in IndexedDB. */
export async function fetchCurrentUser(): Promise<Record<string, unknown>> {
  const { response } = await fetchWithCache("/api/me", { auth: true });
  if (!response.ok) throw new Error("Failed to fetch user");

  const user = await response.json();
  await cacheUser(user);
  return user;
}

/** Persist user data to IndexedDB for offline access. */
export async function cacheUser(user: Record<string, unknown>): Promise<void> {
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
export async function getCachedUser(): Promise<Record<string, unknown> | null> {
  const db = await openAuthDB();
  return new Promise<Record<string, unknown> | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("user");
    request.onsuccess = () => resolve((request as IDBRequest).result?.value ?? null);
    request.onerror = () => reject((request as IDBRequest).error);
  });
}

/** Remove user data from IndexedDB cache. Call on logout. */
export async function clearCachedUser(): Promise<void> {
  const db = await openAuthDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete("user");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject((tx as IDBTransaction).error);
  });
}
