import { useState, useEffect, useCallback } from "react";
import { getAuthState } from "../auth/state.ts";
import { setAuth, clearAuth, ensureValidAuth } from "../auth/store.ts";
import type { AuthData } from "../auth/store.ts";

/**
 * Reactive auth state with actions: setAuth, clearAuth, ensureValid.
 *
 * Usage:
 *   const { authenticated, user, online, isLoading, error, setAuth, clearAuth, ensureValid } = useAuth();
 *
 *   // Login — call setAuth with the response from your login endpoint:
 *   const res = await fetch("/api/login", { method: "POST", body });
 *   const data = await res.json();
 *   await setAuth({ token: data.token, user: data.user, expiresAt: data.expiresAt });
 *
 *   // Logout — clears tokens from memory and user cache from IndexedDB:
 *   await clearAuth();
 *
 *   // Silently refresh the session (page restore) — wraps ensureValidAuth():
 *   const auth = await ensureValid();
 *
 * Auth behavior by type:
 *   - Cookie auth: credentials ("include") sent automatically by the browser.
 *     setAuth still caches user data for offline display.
 *   - Bearer auth: token lives in memory only. clearAuth wipes it.
 *     ensureValid tries a silent refresh via refreshSession() in auth/user.ts.
 *
 * @returns {{ authenticated, user, online, isLoading, error, setAuth, clearAuth, ensureValid }}
 */
export function useAuth() {
  const [state, setState] = useState(() => ({
    authenticated: false,
    user: null as Record<string, unknown> | null,
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    isLoading: false,
    error: null as Error | null,
  }));

  const refreshState = useCallback(async () => {
    try {
      const authState = await getAuthState();
      setState((s) => ({ ...s, ...authState, error: null }));
    } catch {
      // ignore — auth not initialized
    }
  }, []);

  useEffect(() => {
    refreshState();

    const onOnline = () => setState((s) => ({ ...s, online: true }));
    const onOffline = () => setState((s) => ({ ...s, online: false }));
    const onAuthChange = () => refreshState();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("sw-auth-state-change", onAuthChange);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("sw-auth-state-change", onAuthChange);
    };
  }, [refreshState]);

  const doSetAuth = useCallback(async (authData: AuthData) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      await setAuth(authData);
      await refreshState();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState((s) => ({ ...s, error }));
    } finally {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [refreshState]);

  const doClearAuth = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      await clearAuth();
      await refreshState();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState((s) => ({ ...s, error }));
    } finally {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [refreshState]);

  const doEnsureValid = useCallback(async (): Promise<AuthData | null> => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const auth = await ensureValidAuth();
      await refreshState();
      return auth;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState((s) => ({ ...s, error }));
      return null;
    } finally {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [refreshState]);

  return {
    authenticated: state.authenticated,
    user: state.user,
    online: state.online,
    isLoading: state.isLoading,
    error: state.error,
    setAuth: doSetAuth,
    clearAuth: doClearAuth,
    ensureValid: doEnsureValid,
  };
}
