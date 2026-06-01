import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../swoff/hooks/useAuth";
import { clearAuth } from "../../swoff/auth/store";
import { clearCachedUser } from "../../swoff/auth/user";
import InstallButton from "./InstallButton";
import PushSubscribeButton from "./PushSubscribeButton";

export default function Header() {
  const navigate = useNavigate();
  const { authenticated, user } = useAuth();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    await clearAuth();
    await clearCachedUser();
    window.dispatchEvent(
      new CustomEvent("sw-auth-state-change", {
        detail: { authenticated: false },
      }),
    );
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-900/80">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 py-3">
        <Link
          to="/"
          className="text-lg font-bold text-teal-600 dark:text-teal-400"
        >
          Swoff
        </Link>
        <div className="ml-auto flex items-center gap-4 text-sm font-medium">
          <Link
            to="/"
            className="text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Home
          </Link>
          {authenticated && (
            <>
              <Link
                to="/notes"
                className="text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Notes
              </Link>
              <Link
                to="/notes/gql"
                className="text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                GraphQL
              </Link>
            </>
          )}
          <Link
            to="/about"
            className="text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            About
          </Link>
          <InstallButton />
          {authenticated && <PushSubscribeButton />}
          {authenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-gray-500 sm:inline dark:text-gray-400">
                {(user as { name?: string } | null)?.name ?? ""}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:shadow-md"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
