/**
 * Auth State — detect the four auth states for offline/online handling.
 *
 * States:
 *   1. Online + Authenticated  → Normal (fresh data, full UI)
 *   2. Online + Unauthenticated → Login prompt
 *   3. Offline + Authenticated  → Offline access (cached data)
 *   4. Offline + Unauthenticated → Strict offline (public content only)
 *
 * getAuth() tries the adapter first, then falls back to IndexedDB user cache,
 * so this works offline when the provider is unreachable.
 *
 * Public API:
 *   getAuthState   — detect the 4-state matrix (online/offline × auth/unauthed)
 *
 * Internal imports (from ./store):
 *   getAuth, isAuthValid — used internally, not re-exported
 *
 * Usage:
 *   import { getAuthState } from "./auth/state.ts";
 *   const { authenticated, auth, online } = await getAuthState();
 *   const userName = auth?.user?.name; // typed via AuthData
 */

import { getCurrentOnlineStatus } from "../connectivity-manager.ts";
import { getAuth, isAuthValid } from "./store.ts";
import type { AuthData } from "./store.ts";

/** Detect current auth state across the 4-state matrix (online/offline × authenticated/not). */
export async function getAuthState(): Promise<{ authenticated: boolean; auth: AuthData | null; online: boolean }> {
  const auth = await getAuth();
  const valid = isAuthValid(auth);

  return {
    authenticated: valid,
    auth,
    online: getCurrentOnlineStatus(),
  };
}
