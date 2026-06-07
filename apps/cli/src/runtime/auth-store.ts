import type { RuntimeContext } from "./utils.js";
import { T, R, PT, AS } from "./utils.js";

function generateWithAuthHeaders(
  authType: string,
  ts: boolean,
): string {
  const hd = T(ts, "Headers");
  const a = T(ts, "AuthData | null");
  switch (authType) {
    case "cookie":
      return `/** Inject auth headers. For cookie auth, credentials are handled via AUTH_WITH_CREDENTIALS. */
export function withAuthHeaders(headers${hd}, _auth${a})${hd}{
  return headers;
}`;
    case "bearer":
      return `/** Inject Bearer token into request headers. */
export function withAuthHeaders(headers${hd}, auth${a})${hd}{
  if (auth?.token) {
    headers.set("Authorization", \`Bearer \${auth.token}\`);
  }
  return headers;
}`;
    case "custom":
      return `/** Inject custom auth headers. Edit this function to match your backend. */
export function withAuthHeaders(headers${hd}, auth${a})${hd}{
  // --- EDIT THIS BLOCK FOR YOUR BACKEND ---
  // if (auth?.token) {
  //   headers.set("X-Auth-Token", auth.token);
  // }
  // --- END OF EDITABLE BLOCK ---
  return headers;
}`;
    default:
      return `export function withAuthHeaders(headers${hd}, auth${a})${hd}{
  if (auth?.token) {
    headers.set("Authorization", \`Bearer \${auth.token}\`);
  }
  return headers;
}`;
  }
}

function generateIsAuthUrl(
  refreshPath: string,
  userEndpoint: string,
  ts: boolean,
): string {
  return `/** Check if a URL is an auth endpoint that should bypass the SW cache. */
export function isAuthUrl(url${T(ts, "string")})${R(ts, "boolean")}{
  const authPaths = [
    "/login",
    "/logout",
    "/register",
    "/api/login",
    "/api/logout",
    "/api/register",
    "${refreshPath}",
    "${userEndpoint}",
  ];
  return authPaths.some((path) => url.includes(path));
}`;
}

function generateEnsureValidAuth(
  cookieAuth: boolean,
  ts: boolean,
  refreshPath: string,
  ext: string,
): string {
  const cookieGuard = cookieAuth
    ? `  // Cookie auth: server manages the session. No token to restore.
  if (!auth.token) return auth;
`
    : `  // Token missing after page refresh — try silent session restoration
  if (!auth.token) {
    return tryRestoreSession();
  }
`;

  const restoreFunc = cookieAuth
    ? ""
    : `
let restorePromise${T(ts, "Promise<AuthData | null> | null")} = null;

async function tryRestoreSession()${R(ts, "Promise<AuthData | null>")}{
  if (restorePromise) {
    try { return await restorePromise; } finally { restorePromise = null; }
  }
  restorePromise = (async () => {
    try {
      const response = await refreshSession();
      if (!response.ok) return null;
      const data = await response.json();
      const userData = await loadUserData();
      const auth = { ...userData, token: data.token, expiresAt: data.expiresAt };
      await setAuth(auth);
      return auth;
    } catch { return null; }
  })();
  try { return await restorePromise; } finally { restorePromise = null; }
}
`;

  const tokenArg = cookieAuth ? "" : "auth?.token";
  return `/** Try to restore the session after page refresh — delegates to refreshSession() in ./user.${ext}. */${restoreFunc}
let refreshPromise${T(ts, "Promise<AuthData | null> | null")} = null;

export async function ensureValidAuth()${R(ts, "Promise<AuthData | null>")}{
  const auth = await getAuth();
  if (!auth) return null;

${cookieGuard}
  if (!auth.expiresAt || Date.now() < auth.expiresAt) return auth;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
          const response = await refreshSession(${tokenArg});
        if (!response.ok) {
          await clearAuth();
          return null;
        }

        const data = await response.json();
        const updated = { ...auth, token: data.token, expiresAt: data.expiresAt };
        await setAuth(updated);
        return updated;
      } catch {
        await clearAuth();
        return null;
      }
    })();
  }

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}`;
}

export function generateAuthStoreCode(
  ctx: RuntimeContext,
  authType: string,
  refreshPath: string,
  userEndpoint: string,
): string {
  const { ext, ts } = ctx;

  const authDataInterface = ts
    ? `export interface AuthData {
  token?: string;
  user?: Record<string, unknown>;
  expiresAt?: number;
}

export interface AuthResponse extends Record<string, unknown> {
  // Uncomment and type the fields your backend's login response returns:
  // token: string;
  // user: Record<string, unknown>;
  // expiresAt?: number;
}

`
    : "";

  const createAuthFromResponseBlock = ts
    ? `/** Extract AuthData from your backend's login response. Edit this function to match your backend's response shape. */
export function createAuthFromResponse(response: AuthResponse): AuthData {
  // --- EDIT THIS TO MATCH YOUR BACKEND ---
  const data = response as Record<string, unknown>;
  return {
    token: data.token as string,
    user: data.user as Record<string, unknown> | undefined,
    expiresAt: data.expiresAt as number | undefined,
  };
  // --- END OF EDITABLE BLOCK ---
}
`
    : `/** Extract AuthData from your backend's login response. Edit this function to match your backend's response shape. */
export function createAuthFromResponse(response) {
  // --- EDIT THIS TO MATCH YOUR BACKEND ---
  return {
    token: response.token,
    user: response.user,
    expiresAt: response.expiresAt,
  };
  // --- END OF EDITABLE BLOCK ---
}
`;

  return `/**
 * Auth Store — Token in memory only; user info in IndexedDB for offline access.
 *
 * Security:
 *   The Bearer token lives in JavaScript memory and is cleared on page refresh.
 *   Only { user, expiresAt } is persisted to IndexedDB so the app can display
 *   user info offline. After a page refresh, re-login is required.
 *
 * Usage:
 *   import { setAuth, getAuth, clearAuth, isAuthValid } from "./auth/store.${ext}";
 *
 *   await setAuth({ token, user, expiresAt });
 *   const auth = await getAuth();
 *   await clearAuth();
 */

import { refreshSession } from "./user.${ext}";
import { openDB } from "../db.${ext}";

${authDataInterface}const DB_NAME = "swoff-auth";
const STORE_NAME = "auth";

let memoryAuth${T(ts, "AuthData | null")} = null;

${createAuthFromResponseBlock}

async function persistUserData(authData${T(ts, "AuthData | null")})${R(ts, "Promise<void>")}{
  // Only persist { user, expiresAt } — never the token
  const userData = { user: authData?.user, expiresAt: authData?.expiresAt };
  const db = await openDB(DB_NAME, STORE_NAME, "key");
  return new Promise${PT(ts, "void")}((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({ key: "session", value: userData });
    request.onsuccess = () => resolve();
    request.onerror = () => reject((request${AS(ts, "IDBRequest")}).error);
  });
}

async function loadUserData()${R(ts, "Promise<{ user?: Record<string, unknown>; expiresAt?: number } | null>")}{
  const db = await openDB(DB_NAME, STORE_NAME, "key");
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("session");
    request.onsuccess = () => resolve((request${AS(ts, "IDBRequest")}).result?.value ?? null);
    request.onerror = () => reject((request${AS(ts, "IDBRequest")}).error);
  });
}

async function clearPersistedData()${R(ts, "Promise<void>")}{
  const db = await openDB(DB_NAME, STORE_NAME, "key");
  return new Promise${PT(ts, "void")}((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete("session");
    request.onsuccess = () => resolve();
    request.onerror = () => reject((request${AS(ts, "IDBRequest")}).error);
  });
}

/** Store auth data in memory and persist user info to IndexedDB for offline access. */
export async function setAuth(authData${T(ts, "AuthData")})${R(ts, "Promise<void>")}{
  memoryAuth = authData;
  await persistUserData(authData);
}

/** Get auth data from memory (or IndexedDB if memory is empty after page refresh). */
export async function getAuth()${R(ts, "Promise<AuthData | null>")}{
  if (memoryAuth) return memoryAuth;

  const userData = await loadUserData();
  if (userData) {
    memoryAuth = userData;
  }
  return memoryAuth;
}

/** Clear auth from memory and IndexedDB. Call on logout or 401.
 *  Does NOT cascade to queue/caches — the app decides when to clear those.
 *  The fetch-wrapper dispatches sw-auth-unauthorized when needed. */
export async function clearAuth()${R(ts, "Promise<void>")}{
  memoryAuth = null;
  await clearPersistedData();
}

/** Check if auth exists and has not expired. Returns true if no expiresAt is set. */
export function isAuthValid(auth${T(ts, "AuthData | null")})${R(ts, "boolean")}{
  if (!auth) return false;
  if (!auth.expiresAt) return true;
  return Date.now() < auth.expiresAt;
}

${authType === "cookie" ? `export const AUTH_WITH_CREDENTIALS = true;` : `export const AUTH_WITH_CREDENTIALS = false;`}

${generateWithAuthHeaders(authType, ts)}
${generateIsAuthUrl(refreshPath, userEndpoint, ts)}
${generateEnsureValidAuth(authType === "cookie", ts, refreshPath, ext)}
`;
}
