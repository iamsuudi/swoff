import { useState, useEffect, useCallback } from "react";
import { getAuthState } from "../auth/state.ts";
import { setAuth, clearAuth, ensureValidAuth } from "../auth/store.ts";
import type { AuthData } from "../auth/adapter.ts";

/**
 * Reactive auth state with actions: setAuth, clearAuth, ensureValid.
 *
 * Listens for sw-auth-state-change events (dispatched by clearAuth(),
 * setAuth(), or the SW's AUTH_CLEARED broadcast).
 *
 * Usage:
 *   const { authenticated, auth, online, isLoading, error, setAuth, clearAuth, ensureValid } = useSwoffAuth();
 *
 *   // Login:
 *   const res = await fetch("/api/login", { method: "POST", body });
 *   const data = await res.json();
 *   await setAuth({ token: data.token, user: data.user, expiresAt: data.expiresAt });
 *
 *   // Access user data (typed via AuthData):
 *   const userName = auth?.user?.name;
 *
 *   // Logout — clears tokens from memory and user cache from IndexedDB:
 *   await clearAuth();
 *
 *   // Silently refresh the session (page restore):
 *   const authData = await ensureValid();
 *
 * @returns {{ authenticated, auth, online, isLoading, error, setAuth, clearAuth, ensureValid }}
 */
export function useSwoffAuth() {
  const [state, setState] = useState(() => ({
    authenticated: false,
    auth: null as AuthData | null,
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
    auth: state.auth,
    online: state.online,
    isLoading: state.isLoading,
    error: state.error,
    setAuth: doSetAuth,
    clearAuth: doClearAuth,
    ensureValid: doEnsureValid,
  };
}
