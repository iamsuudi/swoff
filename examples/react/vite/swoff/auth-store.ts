/**
 * Auth Store — Token in memory only; user info in IndexedDB for offline access.
 *
 * Security:
 *   The Bearer token lives in JavaScript memory and is cleared on page refresh.
 *   Only { user, expiresAt } is persisted to IndexedDB so the app can display
 *   user info offline. After a page refresh, re-login is required.
 *
 * Usage:
 *   import { setAuth, getAuth, clearAuth, isAuthValid } from "./auth-store.ts";
 *
 *   await setAuth({ token, user, expiresAt });
 *   const auth = await getAuth();
 *   await clearAuth();
 */

const DB_NAME = "swoff-auth";
const STORE_NAME = "auth";

let memoryAuth = null;

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

async function persistUserData(authData) {
  // Only persist { user, expiresAt } — never the token
  const userData = { user: authData?.user, expiresAt: authData?.expiresAt };
  const db = await openAuthDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({ key: "session", value: userData });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function loadUserData() {
  const db = await openAuthDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("session");
    request.onsuccess = () => resolve(request.result?.value || null);
    request.onerror = () => reject(request.error);
  });
}

async function clearPersistedData() {
  const db = await openAuthDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete("session");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store auth data — token stays in memory only.
 * Only user info and expiry are persisted to IndexedDB.
 * @param {{ token?: string, user?: object, expiresAt?: number }} authData
 */
export async function setAuth(authData) {
  memoryAuth = authData;
  await persistUserData(authData);
}

/**
 * Get stored auth — returns memory copy (with token) or
 * falls back to IndexedDB (user info only, no token after refresh).
 */
export async function getAuth() {
  if (memoryAuth) return memoryAuth;

  const userData = await loadUserData();
  if (userData) {
    // After refresh: user info available, but no token — re-login required
    memoryAuth = userData;
  }
  return memoryAuth;
}

/**
 * Clear auth — removes from memory and IndexedDB.
 */
export async function clearAuth() {
  memoryAuth = null;
  await clearPersistedData();
}

/**
 * Check if auth exists and is not expired.
 * @param {object | null} auth — The auth object from getAuth()
 */
export function isAuthValid(auth) {
  if (!auth) return false;
  if (!auth.expiresAt) return true;
  return Date.now() < auth.expiresAt;
}
