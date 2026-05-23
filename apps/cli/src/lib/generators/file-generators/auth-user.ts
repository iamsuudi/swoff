/**
 * Generates auth-user.ts/js — fetch, cache, and invalidate current user.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateAuthUser(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const userEndpoint = ctx.config.features.auth.userEndpoint;

  const code = `/**
 * Current User — fetch, cache, and invalidate the current user for offline access.
 *
 * Usage:
 *   import { fetchCurrentUser, cacheUser, getCachedUser, clearCachedUser } from "./auth-user.${ext}";
 *
 *   await fetchCurrentUser();           // Fetch from server & cache
 *   const user = await getCachedUser(); // Get cached (offline-capable)
 *   await clearCachedUser();            // Clear on logout
 */

import { authenticatedFetch } from "./auth-fetch.${ext}";

const DB_NAME = "swoff-auth-user";
const STORE_NAME = "current-user";

function openAuthDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Fetch current user from your backend and cache locally.
 * Uses userEndpoint from swoff.config.json.
 */
export async function fetchCurrentUser() {
  const response = await authenticatedFetch("${userEndpoint}");
  if (!response.ok) throw new Error("Failed to fetch user");

  const user = await response.json();
  await cacheUser(user);
  return user;
}

/**
 * Store user in IndexedDB for offline access.
 */
export async function cacheUser(user) {
  const db = await openAuthDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ key: "user", value: user });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get cached user — works offline.
 */
export async function getCachedUser() {
  const db = await openAuthDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("user");
    request.onsuccess = () => resolve(request.result?.value || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear cached user on logout.
 */
export async function clearCachedUser() {
  const db = await openAuthDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete("user");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
`;

  writeFile(ctx, `auth-user.${ext}`, code);
}
