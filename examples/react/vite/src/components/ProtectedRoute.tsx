import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { getAuthState } from "../../swoff/auth/state";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; authenticated: boolean }>({ loading: true, authenticated: false });

  useEffect(() => {
    getAuthState().then((s) => setState({ loading: false, authenticated: s.authenticated }));

    const onAuthChange = () => getAuthState().then((s) => setState({ loading: false, authenticated: s.authenticated }));
    window.addEventListener("sw-auth-state-change", onAuthChange);
    return () => window.removeEventListener("sw-auth-state-change", onAuthChange);
  }, []);

  if (state.loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (!state.authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
