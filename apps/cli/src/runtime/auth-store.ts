import type { RuntimeContext } from "./utils.js";
import { T, R, PT, AS } from "./utils.js";

const DEFAULT_AUTH_ROUTES = ["/login", "/logout", "/register", "/api/login", "/api/logout", "/api/register", "/api/refresh", "/api/me"];

export function generateAuthStoreCode(
  ctx: RuntimeContext,
  authType: string,
  authRoutePaths: string[] = DEFAULT_AUTH_ROUTES,
): string {
  const { ext, ts } = ctx;
  const isCookie = authType === "cookie" || authType === "better-auth" || authType === "next-auth" || authType === "clerk";

  const authDataInterface = ts
    ? `export interface AuthData {
  token?: string;
  user?: Record<string, unknown>;
  expiresAt?: number;
}

export interface AuthResponse extends Record<string, unknown> {
  // Your backend's login response fields:
  // token: string;
  // user: Record<string, unknown>;
  // expiresAt?: number;
}

`
    : "";

  const cookieAuthComment = isCookie
    ? ` *
 * Cookie auth: the server manages the session. setAuth() stores user info
 * for offline display. The browser sends the session cookie automatically.`
    : ` *
 * Bearer auth: token lives in memory only — cleared on page refresh.
 * ensureValidAuth() calls adapter.refresh() when the token expires.
 * Only { user, expiresAt } persists to IndexedDB for offline display.`;

  return `/**
 * Auth Store — Token in memory only; user info in IndexedDB for offline access.${cookieAuthComment}
 *
 * Usage:
 *   import { setAuth, getAuth, clearAuth, clearMemoryAuth, isAuthValid, ensureValidAuth, withAuthHeaders } from "./auth/store.${ext}";
 *
 *   await setAuth({ user });
 *   const auth = await getAuth();
 *   await clearAuth();
 *   await clearMemoryAuth();
 *   await ensureValidAuth();
 */

import { adapter } from "./adapter.${ext}";
import { openDB } from "../db.${ext}";

${authDataInterface}const DB_NAME = "swoff-auth";
const STORE_NAME = "auth";
let memoryAuth${T(ts, "AuthData | null")} = null;

// ── Persistence helpers ──────────────────────────────────────────────

async function persistUserData(authData${T(ts, "AuthData | null")})${R(ts, "Promise<void>")}{
  const userData = { user: authData?.user, expiresAt: authData?.expiresAt };
  const db = await openDB(DB_NAME, STORE_NAME, "key");
  try {
    await new Promise${PT(ts, "void")}((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({ key: "session", value: userData });
      request.onsuccess = () => resolve();
      request.onerror = () => reject((request${AS(ts, "IDBRequest")}).error);
    });
  } finally {
    db.close();
  }
}

async function loadUserData()${R(ts, "Promise<{ user?: Record<string, unknown>; expiresAt?: number } | null>")}{
  const db = await openDB(DB_NAME, STORE_NAME, "key");
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get("session");
      request.onsuccess = () => resolve((request${AS(ts, "IDBRequest")}).result?.value ?? null);
      request.onerror = () => reject((request${AS(ts, "IDBRequest")}).error);
    });
  } finally {
    db.close();
  }
}

async function clearPersistedData()${R(ts, "Promise<void>")}{
  const db = await openDB(DB_NAME, STORE_NAME, "key");
  try {
    await new Promise${PT(ts, "void")}((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete("session");
      request.onsuccess = () => resolve();
      request.onerror = () => reject((request${AS(ts, "IDBRequest")}).error);
    });
  } finally {
    db.close();
  }
}

// ── Auth data operations ─────────────────────────────────────────────

/** Store auth data in memory and persist user info to IndexedDB for offline access. */
export async function setAuth(authData${T(ts, "AuthData")})${R(ts, "Promise<void>")}{
  memoryAuth = authData;
  await persistUserData(authData);
}

/** Get auth data from memory, then adapter, then IndexedDB fallback (user info only). */
export async function getAuth()${R(ts, "Promise<AuthData | null>")}{
  if (memoryAuth) return memoryAuth;

  // Try adapter first (for provider-managed auth like Better Auth)
  try {
    const adapterAuth = await adapter.getAuth();
    if (adapterAuth) {
      memoryAuth = adapterAuth;
      await persistUserData(adapterAuth);
      return memoryAuth;
    }
  } catch {
    // Adapter error — fall through to IndexedDB
  }

  // Fall back to IndexedDB user cache
  const userData = await loadUserData();
  if (userData) {
    memoryAuth = userData;
  }
  return memoryAuth;
}

/** Null memory auth only. Use for cross-tab sync — SW broadcasts AUTH_CLEARED, other tabs call this. */
export function clearMemoryAuth()${R(ts, "void")}{
  memoryAuth = null;
}

/** Clear auth from memory, IndexedDB, runtime caches, and dispatch event. Sends AUTH_CLEARED to SW so other tabs clear memory too. Call once on logout. */
export async function clearAuth(options${T(ts, "{ broadcast?: boolean }")} = {})${R(ts, "Promise<void>")}{
  if (options.broadcast !== false) {
    navigator.serviceWorker.controller?.postMessage({ type: "AUTH_CLEARED" });
  }
  memoryAuth = null;
  await clearPersistedData();
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith("swoff-runtime"))
        .map(name => caches.delete(name))
    );
  } catch { /* caches API unavailable */ }
  window.dispatchEvent(new CustomEvent("sw-auth-state-change", { detail: { type: "clear" } }));
}

/** Check if auth exists and has not expired. Returns true if no expiresAt is set. */
export function isAuthValid(auth${T(ts, "AuthData | null")})${R(ts, "boolean")}{
  if (!auth) return false;
  if (!auth.expiresAt) return true;
  return Date.now() < auth.expiresAt;
}

// ── Adapter-delegated functions ──────────────────────────────────────

/** Whether to use credentials: "include" for fetch requests. True for cookie-based auth. */
export const AUTH_WITH_CREDENTIALS = adapter.type === "cookie";

/** Map a login/register response to AuthData. Delegates to the auth adapter. */
export function createAuthFromResponse(response${T(ts, "unknown")})${R(ts, "AuthData")}{
  return adapter.toAuthData(response);
}

/** Inject auth headers into a Headers object. Delegates to the auth adapter. */
export function withAuthHeaders(headers${T(ts, "Headers")}, auth${T(ts, "AuthData | null")})${R(ts, "Headers")}{
  const adapterHeaders = adapter.getHeaders(auth);
  for (const [key, value] of Object.entries(adapterHeaders)) {
    headers.set(key, value);
  }
  return headers;
}

/** Check if a URL is an auth endpoint that should bypass the SW cache. */
export function isAuthUrl(url${T(ts, "string")})${R(ts, "boolean")}{
  return ${JSON.stringify(authRoutePaths)}.some((path) => url.includes(path));
}

// ── Session refresh ──────────────────────────────────────────────────

${isCookie ? `
/**
 * Cookie auth: the server manages the session. No token to restore or refresh.
 * The browser sends the session cookie automatically.
 * getAuth() + IndexedDB user cache provides offline access.
 */
export async function ensureValidAuth()${R(ts, "Promise<AuthData | null>")}{
  return getAuth();
}
` : `
/** Try to restore session after page refresh. Delegates to adapter.refresh(). */
async function tryRestoreSession()${R(ts, "Promise<AuthData | null>")}{
  try {
    const auth = await getAuth();
    if (!auth) return null;
    const refreshed = await adapter.refresh(auth);
    if (refreshed) {
      await setAuth(refreshed);
      return refreshed;
    }
    return null;
  } catch { return null; }
}

let restorePromise${T(ts, "Promise<AuthData | null> | null")} = null;
let refreshPromise${T(ts, "Promise<AuthData | null> | null")} = null;

/**
 * Bearer auth: token expires — try silent refresh via adapter.refresh().
 * If refresh fails, auth is cleared and sw-auth-unauthorized is dispatched.
 */
export async function ensureValidAuth()${R(ts, "Promise<AuthData | null>")}{
  const auth = await getAuth();
  if (!auth) return null;

  // No token after page refresh — try silent session restoration
  if (!auth.token) {
    if (restorePromise) {
      try { return await restorePromise; } finally { restorePromise = null; }
    }
    restorePromise = tryRestoreSession();
    try { return await restorePromise; } finally { restorePromise = null; }
  }

  // Not expired yet
  if (!auth.expiresAt || Date.now() < auth.expiresAt) return auth;

  // Token expired — try refresh via adapter
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshed = await adapter.refresh(auth);
        if (refreshed) {
          await setAuth(refreshed);
          return refreshed;
        }
        await clearAuth();
        return null;
      } catch {
        await clearAuth();
        return null;
      }
    })();
  }

  try { return await refreshPromise; } finally { refreshPromise = null; }
}
`}

/** Fetch current user from the server and cache in IndexedDB. Uses adapter headers for auth. */
export async function fetchCurrentUser()${R(ts, "Promise<Record<string, unknown>>")}{
  const auth = await getAuth();
  const headers${T(ts, "Record<string, string>")} = {};
  const adapterHeaders = adapter.getHeaders(auth);
  for (const [key, value] of Object.entries(adapterHeaders)) {
    headers[key] = value;
  }
  const fetchOpts${T(ts, "RequestInit")} = { headers };
  if (adapter.type === "cookie") {
    fetchOpts.credentials = "include";
  }
  const response = await fetch("/api/me", fetchOpts);
  if (!response.ok) throw new Error("Failed to fetch user");

  const user = await response.json();
  await persistUserData({ user, expiresAt: Date.now() + 3600000 });
  return user;
}
`;
}
