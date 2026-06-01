import { useState, useEffect } from "react";
import { getAuthState } from "../auth/state.ts";

/**
 * Reactive auth state across the 4-state matrix: online/offline × authenticated/not.
 *
 * Automatically re-evaluates on network changes (online/offline) and auth events
 * (sw-auth-state-change). The auth state is derived from auth/store.ts which
 * manages the token in memory with IndexedDB fallback for offline user display.
 *
 * Usage:
 *   const { authenticated, user, online } = useAuth();
 *
 *   // Show login prompt when:
 *   //   online && !authenticated  → needs login
 *   //   offline && !authenticated → strict offline (public content only)
 *   //   offline && authenticated  → show cached data
 *
 * Auth behavior by type:
 *   - Cookie auth: session is maintained by the browser. Page refresh preserves
 *     the session. The auth store tries a silent refresh (POST to refresh endpoint)
 *     if the session appears expired.
 *   - Bearer auth: token lives in memory only (cleared on page refresh). The auth
 *     store attempts a silent session restore by calling refresh endpoint. If the
 *     server responds with a new token, the session resumes transparently.
 *
 * @returns {{ authenticated: boolean, user: Record<string,unknown>|null, online: boolean }}
 */
export function useAuth() {
  const [state, setState] = useState(() => ({
    authenticated: false,
    user: null as Record<string, unknown> | null,
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
  }));

  useEffect(() => {
    getAuthState().then(setState).catch(() => {});

    const onOnline = () => setState((s) => ({ ...s, online: true }));
    const onOffline = () => setState((s) => ({ ...s, online: false }));
    const onAuthChange = () => getAuthState().then(setState).catch(() => {});

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("sw-auth-state-change", onAuthChange);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("sw-auth-state-change", onAuthChange);
    };
  }, []);

  return state;
}
