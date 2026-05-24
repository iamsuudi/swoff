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

const DB_NAME = "swoff-auth";
const STORE_NAME = "auth";

let memoryAuth = null;

function openAuthDB()${R("Promise<IDBDatabase>")}{
async function persistUserData(authData${T("object | null")})${R("Promise<void>")}{
async function loadUserData()${R("Promise<{ user?: Record<string, unknown>; expiresAt?: number } | null>")}{
async function clearPersistedData()${R("Promise<void>")}{
export async function setAuth(authData${T("object")})${R("Promise<void>")}{
export async function getAuth()${R("Promise<object | null>")}{
export async function clearAuth()${R("Promise<void>")}{
export function isAuthValid(auth${T("object | null")})${R("boolean")}{
  if (!auth) return false;
  if (!auth.expiresAt) return true;
  return Date.now() < auth.expiresAt;
}
`;

  writeFile(ctx, `auth/store.${ext}`, code);
}
