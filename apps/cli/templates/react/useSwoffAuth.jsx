import { useState, useEffect, useCallback } from "react";
import { getAuthState } from "../auth/state.js";
import { setAuth, clearAuth, ensureValidAuth } from "../auth/store.js";

/**
 * Reactive auth state with actions: setAuth, clearAuth, ensureValid.
 *
 * Usage:
 *   const { authenticated, auth, online, isLoading, error, setAuth, clearAuth, ensureValid } = useSwoffAuth();
 *
 *   // Login — call setAuth with the response from your login endpoint:
 *   const res = await fetch("/api/login", { method: "POST", body });
 *   const data = await res.json();
 *   await setAuth({ token: data.token, user: data.user, expiresAt: data.expiresAt });
 *
 *   // Access user data:
 *   const userName = auth?.user?.name;
 *
 *   // Logout:
 *   await clearAuth();
 *
 *   // Silent session restore:
 *   const authData = await ensureValid();
 */
export function useSwoffAuth() {
  const [state, setState] = useState(() => ({
    authenticated: false,
    auth: null,
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    isLoading: false,
    error: null,
  }));

  const refreshState = useCallback(async () => {
    try {
      const authState = await getAuthState();
      setState((s) => ({ ...s, ...authState, error: null }));
    } catch {
      // ignore
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

  const doSetAuth = useCallback(async (authData) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      await setAuth(authData);
      await refreshState();
    } catch (err) {
      setState((s) => ({ ...s, error: err instanceof Error ? err : new Error(String(err)) }));
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
      setState((s) => ({ ...s, error: err instanceof Error ? err : new Error(String(err)) }));
    } finally {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [refreshState]);

  const doEnsureValid = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const auth = await ensureValidAuth();
      await refreshState();
      return auth;
    } catch (err) {
      setState((s) => ({ ...s, error: err instanceof Error ? err : new Error(String(err)) }));
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
