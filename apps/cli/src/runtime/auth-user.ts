import type { RuntimeContext } from "./utils.js";
import { T, R, PT, AS } from "./utils.js";

export function generateAuthUserCode(
  ctx: RuntimeContext,
  refreshPath: string,
  userEndpoint: string,
  authType: string,
): string {
  const { ext, ts } = ctx;
  const cookieAuth = authType === "cookie";
  const authTypeName = cookieAuth ? "cookie" : "bearer";

  const refreshDocs = cookieAuth
    ? ` *
 * Cookie auth: credentials ("include") are automatically sent with the request.
 *   The browser attaches the session cookie — no token management needed.
 *   Change method, URL, headers, or body below if your server expects something different.
 *   Example: if your refresh endpoint expects a specific content-type, add:
 *     headers: { "Content-Type": "application/x-www-form-urlencoded" },
 *   Example: if your endpoint uses PUT instead of POST:
 *     method: "PUT",`
    : ` *
 * Bearer auth: the optional \`token\` parameter is passed by auth/store.ts when the user
 *   has an existing session. The generated template adds "Authorization: Bearer <token>".
 *   If your refresh endpoint doesn't need the token (e.g., uses a refresh token cookie),
 *   simply remove the \`token\` parameter and the header logic below.
 *   To send a refresh token in the body instead:
 *     body: JSON.stringify({ refreshToken: "..." }),
 *   To change the content type:
 *     headers: { "Content-Type": "application/x-www-form-urlencoded" },`;

  const userDocs = cookieAuth
    ? ` *
 * Cookie auth: credentials ("include") sends the session cookie automatically.
 *   Edit the URL, method, or headers below if your user endpoint differs.
 *   Example: if your server uses /api/v1/me with a different method:
 *     const response = await fetch(API_BASE + "/api/v1/me", {
 *       method: "GET",
 *       credentials: "include",
 *     });`
    : ` *
 * Bearer auth: add the Authorization header using the user's token.
 *   Get the token from auth/store.ts:
 *     import { getAuth } from "./store.${ext}";
 *     const auth = await getAuth();
 *     const response = await fetch(API_BASE + "${userEndpoint}", {
 *       headers: { "Authorization": \`Bearer \${auth?.token}\` },
 *     });
 *   If your endpoint uses a different method or body, edit accordingly below.`;

  return `/**
 * Auth User — refresh session and fetch current user.
 *
 * This file is YOUR control panel for auth HTTP calls. swoff generates sensible
 * defaults based on your swoff.config.json auth type (cookie/bearer), then you
 * edit the functions below to match your server exactly.
 *
 * Both functions are imported by swoff's auth store (auth/store.${ext}) so your
 * edits flow through to session refresh, 401 retry, and user caching.
 *
 * Usage:
 *   import { refreshSession, fetchCurrentUser, cacheUser, getCachedUser, clearCachedUser } from "./auth/user.${ext}";
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

import { API_BASE } from "../config.${ext}";

const DB_NAME = "swoff-auth-user";
const STORE_NAME = "current-user";
// Bump this when adding new indexes/stores for schema migration
const DB_VERSION = 1;

function openAuthDB()${R(ts, "Promise<IDBDatabase>")}{
  return new Promise${PT(ts, "IDBDatabase")}((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target${AS(ts, "IDBOpenDBRequest")}).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = (e) => resolve((e.target${AS(ts, "IDBOpenDBRequest")}).result);
    request.onerror = (e) => reject((e.target${AS(ts, "IDBRequest")}).error);
  });
}

/**
 * Refresh the auth session.
 *
 * Called automatically by auth/store.{{ext}} when the access token expires
 * (ensureValidAuth) or to restore a session after page reload (tryRestoreSession).
 *
 * ${authTypeName} defaults:${refreshDocs}
 *
 * ${cookieAuth ? "" : "@param token - Bearer token from the existing session (only passed for bearer auth)."}
 * @returns A fetch Response. The auth store reads response.json() to extract
 *          { token, expiresAt } and merges them with cached user data.
 */
export async function refreshSession(${cookieAuth ? "" : "token"+T(ts, "string")})${R(ts, "Promise<Response>")}{
  ${cookieAuth
    ? `return fetch(API_BASE + "${refreshPath}", {
    method: "POST",
    credentials: "include" as RequestCredentials,
  });`
    : `const headers${T(ts, "Record<string, string>")} = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = \`Bearer \${token}\`;
  return fetch(API_BASE + "${refreshPath}", {
    method: "POST",
    headers,
  });`}
}

/**${userDocs}
 */
export async function fetchCurrentUser()${R(ts, "Promise<Record<string, unknown>>")}{
  ${cookieAuth
    ? `const response = await fetch(API_BASE + "${userEndpoint}", {
    credentials: "include" as RequestCredentials,
  });`
    : `const response = await fetch(API_BASE + "${userEndpoint}");`}
  if (!response.ok) throw new Error("Failed to fetch user");

  const user = await response.json();
  await cacheUser(user);
  return user;
}

/** Persist user data to IndexedDB for offline access. */
export async function cacheUser(user${T(ts, "Record<string, unknown>")})${R(ts, "Promise<void>")}{
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
export async function getCachedUser()${R(ts, "Promise<Record<string, unknown> | null>")}{
  const db = await openAuthDB();
  return new Promise${PT(ts, "Record<string, unknown> | null")}((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("user");
    request.onsuccess = () => resolve((request${AS(ts, "IDBRequest")}).result?.value ?? null);
    request.onerror = () => reject((request${AS(ts, "IDBRequest")}).error);
  });
}

/** Remove user data from IndexedDB cache. Call on logout. */
export async function clearCachedUser()${R(ts, "Promise<void>")}{
  const db = await openAuthDB();
  return new Promise${PT(ts, "void")}((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete("user");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject((tx${AS(ts, "IDBTransaction")}).error);
  });
}
`;
}
