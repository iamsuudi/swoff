import { Link } from "react-router-dom";
import { useAuth } from "../../swoff/hooks/useAuth";

export default function LandingPage() {
  const { authenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
          Swoff Demo App
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
          A demonstration of offline-first PWA patterns with React, Vite, and Swoff.
          Browse notes, make changes offline, and watch them sync automatically.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          {authenticated ? (
            <>
              <Link to="/notes"
                className="inline-flex w-48 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:shadow-xl hover:-translate-y-0.5">
                Browse Notes
              </Link>
            </>
          ) : (
            <>
              <Link to="/login"
                className="inline-flex w-48 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:shadow-xl hover:-translate-y-0.5">
                Sign In
              </Link>
              <Link to="/register"
                className="inline-flex w-48 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                Register
              </Link>
            </>
          )}
        </div>
        <div className="mt-16 grid gap-6 text-left sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">Cache Strategies</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Network-first for API data, cache-first for static assets. Reads are fast, data stays fresh.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">Offline Queue</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Mutations queued offline sync automatically when connection restores. No data loss.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">Tag Invalidation</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Stale cache entries are purged after mutations. Next read fetches fresh data automatically.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
