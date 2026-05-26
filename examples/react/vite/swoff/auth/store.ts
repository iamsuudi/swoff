/**
 * Auth Store — Token in memory only; user info in IndexedDB for offline access.
 *
 * Security:
 *   The Bearer token lives in JavaScript memory and is cleared on page refresh.
 *   Only { user, expiresAt } is persisted to IndexedDB so the app can display
 *   user info offline. After a page refresh, re-login is required.
 *
 * Usage:
 *   import { setAuth, getAuth, clearAuth, isAuthValid } from "./auth/store.ts";
 *
 *   await setAuth({ token, user, expiresAt });
 *   const auth = await getAuth();
 *   await clearAuth();
 */

export interface AuthData {
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

const DB_NAME = "swoff-auth";
const STORE_NAME = "auth";

let memoryAuth: AuthData | null = null;

/** Extract AuthData from your backend's login response. Edit this function to match your backend's response shape. */
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

async function persistUserData(authData: AuthData | null): Promise<void> {
  // Only persist { user, expiresAt } — never the token
  const userData = { user: authData?.user, expiresAt: authData?.expiresAt };
  const db = await openAuthDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({ key: "session", value: userData });
    request.onsuccess = () => resolve();
    request.onerror = () => reject((request as IDBRequest).error);
  });
}

async function loadUserData(): Promise<{ user?: Record<string, unknown>; expiresAt?: number } | null> {
  const db = await openAuthDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("session");
    request.onsuccess = () => resolve((request as IDBRequest).result?.value ?? null);
    request.onerror = () => reject((request as IDBRequest).error);
  });
}

async function clearPersistedData(): Promise<void> {
  const db = await openAuthDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete("session");
    request.onsuccess = () => resolve();
    request.onerror = () => reject((request as IDBRequest).error);
  });
}

/** Store auth data in memory and persist user info to IndexedDB for offline access. */
export async function setAuth(authData: AuthData): Promise<void> {
  memoryAuth = authData;
  await persistUserData(authData);
}

/** Get auth data from memory (or IndexedDB if memory is empty after page refresh). */
export async function getAuth(): Promise<AuthData | null> {
  if (memoryAuth) return memoryAuth;

  const userData = await loadUserData();
  if (userData) {
    memoryAuth = userData;
  }
  return memoryAuth;
}

/** Clear auth from memory and IndexedDB. Call on logout or 401. */
export async function clearAuth(): Promise<void> {
  memoryAuth = null;
  await clearPersistedData();
}

/** Check if auth exists and has not expired. Returns true if no expiresAt is set. */
export function isAuthValid(auth: AuthData | null): boolean {
  if (!auth) return false;
  if (!auth.expiresAt) return true;
  return Date.now() < auth.expiresAt;
}

export const AUTH_WITH_CREDENTIALS = false;

/** Inject Bearer token into request headers. */
export function withAuthHeaders(headers: Headers, auth: AuthData | null): Headers{
  if (auth?.token) {
    headers.set("Authorization", `Bearer ${auth.token}`);
  }
  return headers;
}
/** Check if a URL is an auth endpoint that should bypass the SW cache. */
export function isAuthUrl(url: string): boolean {
  const authPaths = [
    "/login",
    "/logout",
    "/register",
    "/api/login",
    "/api/logout",
    "/api/register",
    "/api/refresh",
    "/api/me",
  ];
  return authPaths.some((path) => url.includes(path));
}
/** Refresh the auth token via the refresh endpoint. Uses plain fetch to bypass SW cache. */
let refreshPromise: Promise<AuthData | null> | null = null;

export async function ensureValidAuth(): Promise<AuthData | null> {
  const auth = await getAuth();
  if (!auth) return null;
  if (!auth.expiresAt || Date.now() < auth.expiresAt) return auth;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const headers = new Headers({ "Content-Type": "application/json" });
      withAuthHeaders(headers, auth);
      try {
        const response = await fetch("/api/refresh", {
          method: "POST",
          headers,
      });

        if (!response.ok) {
          await clearAuth();
          window.dispatchEvent(new CustomEvent("sw-auth-unauthorized"));
          return null;
        }

        const data = await response.json();
        const updated = { ...auth, token: data.token, expiresAt: data.expiresAt };
        await setAuth(updated);
        return updated;
      } catch {
        await clearAuth();
        window.dispatchEvent(new CustomEvent("sw-auth-unauthorized"));
        return null;
      }
    })();
  }

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}
