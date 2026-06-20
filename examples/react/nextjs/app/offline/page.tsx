"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <svg
            className="h-8 w-8 text-amber-600 dark:text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          You&apos;re offline
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Please check your internet connection and try again. Any changes you
          made will be saved and synced when you&apos;re back online.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-teal-500 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:shadow-xl hover:-translate-y-0.5"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
            />
          </svg>
          Try Again
        </button>
        <div className="mt-6">
          <Link
            href="/"
            className="text-sm font-medium text-teal-600 underline-offset-2 hover:underline dark:text-teal-400"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
