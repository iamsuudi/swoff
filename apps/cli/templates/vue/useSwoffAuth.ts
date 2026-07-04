import { ref, onMounted, onUnmounted } from "vue";
import { getAuthState } from "../auth/state";
import { setAuth, clearAuth, ensureValidAuth } from "../auth/store";
import type { AuthData } from "../auth/adapter";

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
 *   const res = await fetch("/api/login", { method: "POST" });
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
  const authenticated = ref(false);
  const auth = ref<AuthData | null>(null);
  const online = ref(typeof navigator !== "undefined" ? navigator.onLine : true);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  async function refreshState() {
    try {
      const authState = await getAuthState();
      authenticated.value = authState.authenticated;
      auth.value = authState.auth;
      error.value = null;
    } catch {
      // ignore — auth not initialized
    }
  }

  onMounted(() => {
    refreshState();

    function onOnline() { online.value = true; }
    function onOffline() { online.value = false; }
    function onAuthChange() { refreshState(); }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("sw-auth-state-change", onAuthChange);

    onUnmounted(() => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("sw-auth-state-change", onAuthChange);
    });
  });

  async function doSetAuth(authData: AuthData) {
    isLoading.value = true;
    error.value = null;
    try {
      await setAuth(authData);
      await refreshState();
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      isLoading.value = false;
    }
  }

  async function doClearAuth() {
    isLoading.value = true;
    error.value = null;
    try {
      await clearAuth();
      await refreshState();
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      isLoading.value = false;
    }
  }

  async function doEnsureValid(): Promise<AuthData | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await ensureValidAuth();
      await refreshState();
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      return null;
    } finally {
      isLoading.value = false;
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
