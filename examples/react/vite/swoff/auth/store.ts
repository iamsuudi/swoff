/**
 * Auth Store — Token in memory only; user info in IndexedDB for offline access. *
 * Cookie auth: the server manages the session. setAuth() stores user info
 * for offline display. The browser sends the session cookie automatically.
 *
 * Public API (functions listed here):
 *   setAuth, getAuth, clearAuth, clearMemoryAuth, isAuthValid,
 *   ensureValidAuth, withAuthHeaders, createAuthFromResponse,
 *   AUTH_WITH_CREDENTIALS, isAuthUrl
 *
 * Internal helpers (not exported — used by Swoff internally):
 *   persistUserData, loadUserData, clearPersistedData
 *
 * Usage:
 *   import { setAuth, getAuth, clearAuth, clearMemoryAuth, isAuthValid, ensureValidAuth, withAuthHeaders } from "./auth/store.ts";
 *
 *   await setAuth({ user });
 *   const auth = await getAuth();
 *   await clearAuth();
 *   await clearMemoryAuth();
 *   await ensureValidAuth();
 */

import { adapter } from "./adapter.ts";
import { openDB } from "../db.ts";

export interface AuthData {
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

const DB_NAME = "swoff-auth";
const STORE_NAME = "auth";
let memoryAuth: AuthData | null = null;

// ── Internal: persistence helpers ────────────────────────────────────

async function persistUserData(authData: AuthData | null): Promise<void> {
  const userData = { user: authData?.user, expiresAt: authData?.expiresAt };
  const db = await openDB(DB_NAME, STORE_NAME, "key");
  try {
    await new Promise<void>((resolve, reject) => {
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

async function loadUserData(): Promise<{ user?: Record<string, unknown>; expiresAt?: number } | null> {
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

async function clearPersistedData(): Promise<void> {
  const db = await openDB(DB_NAME, STORE_NAME, "key");
  try {
    await new Promise<void>((resolve, reject) => {
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
export async function setAuth(authData: AuthData): Promise<void> {
  memoryAuth = authData;
  await persistUserData(authData);
}

/** Get auth data from memory, then adapter, then IndexedDB fallback (user info only). */
export async function getAuth(): Promise<AuthData | null> {
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
export function clearMemoryAuth(): void {
  memoryAuth = null;
}

/** Clear auth from memory, IndexedDB, runtime caches, and dispatch event. Sends AUTH_CLEARED to SW so other tabs clear memory too. Call once on logout. */
export async function clearAuth(options: { broadcast?: boolean } = {}): Promise<void> {
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
export function isAuthValid(auth: AuthData | null): boolean {
  if (!auth) return false;
  if (!auth.expiresAt) return true;
  return Date.now() < auth.expiresAt;
}

// ── Public API: adapter-delegated ────────────────────────────────────

/** Whether to use credentials: "include" for fetch requests. True for cookie-based auth. */
export const AUTH_WITH_CREDENTIALS = adapter.type === "cookie";

/** Map a login/register response to AuthData. Delegates to the auth adapter. */
export function createAuthFromResponse(response: unknown): AuthData {
  return adapter.toAuthData(response);
}

/** Inject auth headers into a Headers object. Delegates to the auth adapter. */
export function withAuthHeaders(headers: Headers, auth: AuthData | null): Headers {
  const adapterHeaders = adapter.getHeaders(auth);
  for (const [key, value] of Object.entries(adapterHeaders)) {
    headers.set(key, value);
  }
  return headers;
}

/** Check if a URL is an auth endpoint that should bypass the SW cache. */
export function isAuthUrl(url: string): boolean {
  return ["/login","/logout","/register","/api/login","/api/logout","/api/register","/api/refresh","/api/me"].some((path) => url.includes(path));
}

// ── Public API: session refresh ──────────────────────────────────────


/**
 * Cookie auth: the server manages the session. No token to restore or refresh.
 * The browser sends the session cookie automatically.
 * getAuth() + IndexedDB user cache provides offline access.
 */
export async function ensureValidAuth(): Promise<AuthData | null> {
  return getAuth();
}


