import { writable } from "svelte/store";
import { onMount } from "svelte";
import { getAuthState } from "../auth/state";
import { setAuth, clearAuth, ensureValidAuth } from "../auth/store";
import type { AuthData } from "../auth/adapter";

export function useSwoffAuth() {
  const authenticated = writable(false);
  const auth = writable<AuthData | null>(null);
  const online = writable(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  async function refreshState() {
    try {
      const authState = await getAuthState();
      authenticated.set(authState.authenticated);
      auth.set(authState.auth);
      error.set(null);
    } catch {
      // ignore — auth not initialized
    }
  }

  onMount(() => {
    refreshState();

    function onOnline() { online.set(true); }
    function onOffline() { online.set(false); }
    function onAuthChange() { refreshState(); }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("sw-auth-state-change", onAuthChange);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("sw-auth-state-change", onAuthChange);
    };
  });

  async function doSetAuth(authData: AuthData) {
    isLoading.set(true);
    error.set(null);
    try {
      await setAuth(authData);
      await refreshState();
    } catch (err) {
      error.set(err instanceof Error ? err : new Error(String(err)));
    } finally {
      isLoading.set(false);
    }
  }

  async function doClearAuth() {
    isLoading.set(true);
    error.set(null);
    try {
      await clearAuth();
      await refreshState();
    } catch (err) {
      error.set(err instanceof Error ? err : new Error(String(err)));
    } finally {
      isLoading.set(false);
    }
  }

  async function doEnsureValid(): Promise<AuthData | null> {
    isLoading.set(true);
    error.set(null);
    try {
      const result = await ensureValidAuth();
      await refreshState();
      return result;
    } catch (err) {
      error.set(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      isLoading.set(false);
    }
  }

  return {
    authenticated,
    auth,
    online,
    isLoading,
    error,
    setAuth: doSetAuth,
    clearAuth: doClearAuth,
    ensureValid: doEnsureValid,
  };
}
