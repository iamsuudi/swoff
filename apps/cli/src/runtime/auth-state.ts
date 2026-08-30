import type { RuntimeContext } from "./utils.js";
import { R } from "./utils.js";

export function generateAuthStateCode(ctx: RuntimeContext): string {
  const { ext, ts } = ctx;
  return `/**
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
  * Depends on the shared online/offline primitive in ../online-status.${ext}
  * (also used by the connectivity feature).
  *
  * Usage:
  *   import { getAuthState } from "./auth/state.${ext}";
  *   const { authenticated, auth, online } = await getAuthState();
  *   const userName = auth?.user?.name; // typed via AuthData
  */

import { getCurrentOnlineStatus } from "../online-status.${ext}";
import { getAuth, isAuthValid } from "./store.${ext}";
import type { AuthData } from "./adapter.${ext}";

/** Detect current auth state across the 4-state matrix (online/offline × authenticated/not). */
export async function getAuthState()${R(ts, "Promise<{ authenticated: boolean; auth: AuthData | null; online: boolean }>")}{
  const auth = await getAuth();
  const valid = isAuthValid(auth);

  return {
    authenticated: valid,
    auth,
    online: getCurrentOnlineStatus(),
  };
}
`;
}
