/**
 * Auth User — refresh session and fetch current user.
 *
 * This file is YOUR control panel for auth HTTP calls. swoff generates sensible
 * defaults based on your swoff.config.json auth type (cookie/bearer), then you
 * edit the functions below to match your server exactly.
 *
 * Both functions are imported by swoff's auth store (auth/store.ts) so your
 * edits flow through to session refresh, 401 retry, and user caching.
 *
 * Usage:
 *   import { refreshSession, fetchCurrentUser, cacheUser, getCachedUser, clearCachedUser } from "./auth/user.ts";
 *
 *   // Refresh the session (called automatically by the auth store)
 *   const response = await refreshSession();
 *   const data = await response.json();
 *
 *   // Fetch and cache the current user
 *   const user = await fetchCurrentUser();
 *
 *   // Get cached user (offline-capable)
 *   const cached = await getCachedUser();
 *
 *   // Clear on logout
 *   await clearCachedUser();
 */

import { API_BASE } from "../config.ts";

import { openDB } from "../db.ts";

const DB_NAME = "swoff-auth-user";
const STORE_NAME = "current-user";

/**
 * Refresh the auth session.
 *
 * Called automatically by auth/store.{{ext}} when the access token expires
 * (ensureValidAuth) or to restore a session after page reload (tryRestoreSession).
 *
 * cookie defaults: *
 * Cookie auth: credentials ("include") are automatically sent with the request.
 *   The browser attaches the session cookie — no token management needed.
 *   Change method, URL, headers, or body below if your server expects something different.
 *   Example: if your refresh endpoint expects a specific content-type, add:
 *     headers: { "Content-Type": "application/x-www-form-urlencoded" },
 *   Example: if your endpoint uses PUT instead of POST:
 *     method: "PUT",
 *
 * 
 * @returns A fetch Response. The auth store reads response.json() to extract
 *          { token, expiresAt } and merges them with cached user data.
 */
export async function refreshSession(): Promise<Response> {
  return fetch(API_BASE + "/api/refresh", {
    method: "POST",
    credentials: "include" as RequestCredentials,
  });
}

/** *
 * Cookie auth: credentials ("include") sends the session cookie automatically.
 *   Edit the URL, method, or headers below if your user endpoint differs.
 *   Example: if your server uses /api/v1/me with a different method:
 *     const response = await fetch(API_BASE + "/api/v1/me", {
 *       method: "GET",
 *       credentials: "include",
 *     });
 */
export async function fetchCurrentUser(): Promise<Record<string, unknown>> {
  const response = await fetch(API_BASE + "/api/me", {
    credentials: "include" as RequestCredentials,
  });
  if (!response.ok) throw new Error("Failed to fetch user");

  const user = await response.json();
  await cacheUser(user);
  return user;
}

/** Persist user data to IndexedDB for offline access. */
export async function cacheUser(user: Record<string, unknown>): Promise<void> {
  const db = await openDB(DB_NAME, STORE_NAME, "key");
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
  const db = await openDB(DB_NAME, STORE_NAME, "key");
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
  const db = await openDB(DB_NAME, STORE_NAME, "key");
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete("user");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject((tx as IDBTransaction).error);
  });
}
