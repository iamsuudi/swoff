import { useState, useEffect } from "react";
import { getAuthState } from "../auth/state.js";

export function useAuth() {
  const [state, setState] = useState(() => ({
    authenticated: false,
    user: null,
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
