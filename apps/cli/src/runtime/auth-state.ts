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
 * Usage:
 *   import { getAuthState } from "./auth/state.${ext}";
 *   const { authenticated, user, online } = await getAuthState();
 */

import { getCurrentOnlineStatus } from "../connectivity-manager.${ext}";
import { getAuth, isAuthValid } from "./store.${ext}";

/** Detect current auth state across the 4-state matrix (online/offline × authenticated/not). */
export async function getAuthState()${R(ts, "Promise<{ authenticated: boolean; user: Record<string, unknown> | null; online: boolean }>")}{
  const auth = await getAuth();
  const valid = isAuthValid(auth);

  return {
    authenticated: valid,
    user: auth?.user ?? null,
    online: getCurrentOnlineStatus(),
  };
}
`;
}
