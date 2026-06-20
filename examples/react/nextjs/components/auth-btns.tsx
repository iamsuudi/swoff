"use client";

import { useAuth } from "@/swoff/adapters/useAuth";
import Link from "next/link";

export function AuthButtons() {
  const { authenticated } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
      {authenticated ? (
        <Link
          href="/notes"
          className="inline-flex w-48 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-teal-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:shadow-xl hover:-translate-y-0.5"
        >
          Browse Notes
        </Link>
      ) : (
        <>
          <Link
            href="/login"
            className="inline-flex w-48 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-teal-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:shadow-xl hover:-translate-y-0.5"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex w-48 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            Register
          </Link>
        </>
      )}
    </div>
  );
}
