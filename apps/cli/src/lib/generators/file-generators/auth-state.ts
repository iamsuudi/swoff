/**
 * Generates auth-state.ts/js — auth state detection for the 4-state matrix.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateAuthState(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const R = (type: string) => (ts ? `: ${type} ` : " ");

  const code = `/**
 * Auth State — detect the four auth states for offline/online handling.
 *
 * States:
 *   1. Online + Authenticated  → Normal (fresh data, full UI)
 *   2. Online + Unauthenticated → Login prompt
 *   3. Offline + Authenticated  → Offline access (cached data)
 *   4. Offline + Unauthenticated → Strict offline (public content only)
 *
 * Usage:
 *   import { getAuthState } from "./auth/state.${ext}";
 *   const { authenticated, user, online } = await getAuthState();
 */

import { getAuth, isAuthValid } from "./store.${ext}";
import { getCachedUser } from "./user.${ext}";

export async function getAuthState()${R("Promise<{ authenticated: boolean; user: Record<string, unknown> | null; online: boolean }>")}{
  const auth = await getAuth();
  const valid = isAuthValid(auth);
  const user = valid ? await getCachedUser() : null;

  return {
    authenticated: valid,
    user,
    online: navigator.onLine,
  };
}
`;

  writeFile(ctx, `auth/state.${ext}`, code);
}
