import type { RuntimeContext } from "./utils.js";
import { T, R, PT } from "./utils.js";

const DEFAULT_AUTH_ROUTES = [
  "/login",
  "/logout",
  "/register",
  "/api/login",
  "/api/logout",
  "/api/register",
  "/api/refresh",
  "/api/me",
];

export function generateAuthStoreCode(
  ctx: RuntimeContext,
  authType: string,
  authRoutePaths: string[] = DEFAULT_AUTH_ROUTES,
  mutationQueueEnabled: boolean = false,
  cachingEnabled: boolean = false,
): string {
  const { ext, ts } = ctx;
  const isCookie = authType === "cookie";

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
 * Public API (functions listed here):
 *   setAuth, getAuth, clearAuth, clearMemoryAuth, isAuthValid,
 *   ensureValidAuth, withAuthHeaders,
 *   AUTH_WITH_CREDENTIALS, isAuthUrl
 *
 * Internal helpers (not exported — used by Swoff internally):
 *   persistUserData, loadUserData, clearPersistedData
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
${ts ? `import type { AuthData } from "./adapter.${ext}";` : ""}
import { openDB } from "../db.${ext}";
${mutationQueueEnabled ? `import { clearQueue } from "../mutation/queue.${ext}";\n` : ""}

const DB_NAME = "swoff-auth";
const STORE_NAME = "auth";
let memoryAuth${T(ts, "AuthData | null")} = null;
let _fetchingUser = false;

// ── Internal: persistence helpers ────────────────────────────────────

async function persistUserData(authData${T(ts, "AuthData | null")})${R(ts, "Promise<void>")}{
  const userData = { user: authData?.user, expiresAt: authData?.expiresAt };
  const db = await openDB(DB_NAME, STORE_NAME, "key");
  try {
    await new Promise${PT(ts, "void")}((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({ key: "session", value: userData });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function loadUserData()${R(ts, "Promise<AuthData | null>")}{
  const db = await openDB(DB_NAME, STORE_NAME, "key");
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get("session");
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => reject(request.error);
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
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

// ── Public API: auth data operations ─────────────────────────────────

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
    // Adapter confirmed no session — don't fall through to stale IDB
    return null;
  } catch {
    // Adapter error (network failure) — fall through to IndexedDB
  }

  // Fall back to IndexedDB user cache (only reached on adapter error)
  const userData = await loadUserData();
  if (userData) {
    memoryAuth = userData;
    return memoryAuth;
  }

  // Last resort — try server fetch
  if (_fetchingUser) return null;
  _fetchingUser = true;
  try {
    const fetched = await adapter.fetchUser();
    if (fetched) {
      memoryAuth = fetched;
      await persistUserData(fetched);
      return memoryAuth;
    }
  } catch {
    // Server unreachable — no auth data available
  } finally {
    _fetchingUser = false;
  }

  return null;
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
  ${cachingEnabled ? `try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith("swoff-runtime"))
        .map(name => caches.delete(name))
    );
  } catch { /* caches API unavailable */ }
` : `  // Caching is disabled — auth logout does not touch runtime caches.
`}  ${mutationQueueEnabled ? `await clearQueue();\n` : ""}  window.dispatchEvent(new CustomEvent("sw-auth-state-change", { detail: { type: "clear" } }));
}

/** Check if auth exists and has not expired. Returns true if no expiresAt is set. */
export function isAuthValid(auth${T(ts, "AuthData | null")})${R(ts, "boolean")}{
  if (!auth) return false;
  if (!auth.expiresAt) return true;
  return Date.now() < auth.expiresAt;
}

// ── Public API: adapter-delegated ────────────────────────────────────

/** Whether to use credentials: "include" for fetch requests. True for cookie-based auth. */
export const AUTH_WITH_CREDENTIALS = adapter.type === "cookie";

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
  var urlPath = url.indexOf("://") !== -1 ? new URL(url).pathname.replace(/\/$/, "") : url.replace(/\/$/, "");
  return ${JSON.stringify(authRoutePaths)}.some(function(path) { return urlPath === path; });
}

// ── Public API: session refresh ──────────────────────────────────────

${
  isCookie
    ? `
/**
 * Cookie auth: the server manages the session. No token to restore or refresh.
 * The browser sends the session cookie automatically.
 * getAuth() + IndexedDB user cache provides offline access.
 */
export async function ensureValidAuth()${R(ts, "Promise<AuthData | null>")}{
  return getAuth();
}
`
    : `
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
`
}

`;
}
