/**
 * Generates auth-store.ts/js — token storage with memory-only for token,
 * IndexedDB for offline user info only (no token persisted).
 *
 * Security: the Bearer token lives in memory only and is cleared on page
 * refresh. Only { user, expiresAt } is persisted to IndexedDB for offline
 * user display. After a page refresh, re-login is required.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateAuthStore(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";

  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");
  const PT = (type: string) => (ts ? `<${type}>` : "");
  const AS = (type: string) => (ts ? ` as ${type}` : "");

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

  const code = `/**
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

${authDataInterface}const DB_NAME = "swoff-auth";
const STORE_NAME = "auth";

let memoryAuth${T("AuthData | null")} = null;

${createAuthFromResponseBlock}
function openAuthDB()${R("Promise<IDBDatabase>")}{
  return new Promise${PT("IDBDatabase")}((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target${AS("IDBOpenDBRequest")}).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = (e) => resolve((e.target${AS("IDBOpenDBRequest")}).result);
    request.onerror = (e) => reject((e.target${AS("IDBRequest")}).error);
  });
}

async function persistUserData(authData${T("AuthData | null")})${R("Promise<void>")}{
  // Only persist { user, expiresAt } — never the token
  const userData = { user: authData?.user, expiresAt: authData?.expiresAt };
  const db = await openAuthDB();
  return new Promise${PT("void")}((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({ key: "session", value: userData });
    request.onsuccess = () => resolve();
    request.onerror = () => reject((request${AS("IDBRequest")}).error);
  });
}

async function loadUserData()${R("Promise<{ user?: Record<string, unknown>; expiresAt?: number } | null>")}{
  const db = await openAuthDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("session");
    request.onsuccess = () => resolve((request${AS("IDBRequest")}).result?.value ?? null);
    request.onerror = () => reject((request${AS("IDBRequest")}).error);
  });
}

async function clearPersistedData()${R("Promise<void>")}{
  const db = await openAuthDB();
  return new Promise${PT("void")}((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete("session");
    request.onsuccess = () => resolve();
    request.onerror = () => reject((request${AS("IDBRequest")}).error);
  });
}

/** Store auth data in memory and persist user info to IndexedDB for offline access. */
export async function setAuth(authData${T("AuthData")})${R("Promise<void>")}{
  memoryAuth = authData;
  await persistUserData(authData);
}

/** Get auth data from memory (or IndexedDB if memory is empty after page refresh). */
export async function getAuth()${R("Promise<AuthData | null>")}{
  if (memoryAuth) return memoryAuth;

  const userData = await loadUserData();
  if (userData) {
    memoryAuth = userData;
  }
  return memoryAuth;
}

/** Clear auth from memory and IndexedDB. Call on logout or 401. */
export async function clearAuth()${R("Promise<void>")}{
  memoryAuth = null;
  await clearPersistedData();
}

/** Check if auth exists and has not expired. Returns true if no expiresAt is set. */
export function isAuthValid(auth${T("AuthData | null")})${R("boolean")}{
  if (!auth) return false;
  if (!auth.expiresAt) return true;
  return Date.now() < auth.expiresAt;
}
`;

  writeFile(ctx, `auth/store.${ext}`, code);
}
