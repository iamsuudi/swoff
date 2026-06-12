import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
            Swoff Notes
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            An offline-first demo app showcasing Swoff&apos;s service worker
            caching, tag invalidation, and mutation queuing.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <Link
            to="/notes"
            search={{ q: '' }}
            className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/30">
              <svg
                className="h-6 w-6 text-teal-600 dark:text-teal-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Server-Rendered Notes
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Fetched and rendered on the server. No client hooks — uses URL
              search params for filtering, createServerFn for data.
            </p>
          </Link>

          <Link
            to="/notes/client"
            className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <svg
                className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Client-Side Notes
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Rendered with React hooks using{' '}
              <code className="text-teal-600 dark:text-teal-400">
                useCachedFetch
              </code>{' '}
              and{' '}
              <code className="text-teal-600 dark:text-teal-400">
                useMutation
              </code>
              . Works offline with cached data and mutation queuing.
            </p>
          </Link>

          <Link
            to="/notes/gql"
            className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/30">
              <svg
                className="h-6 w-6 text-violet-600 dark:text-violet-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              GraphQL Notes
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Using{' '}
              <code className="text-teal-600 dark:text-teal-400">queryGql</code>{' '}
              and{' '}
              <code className="text-teal-600 dark:text-teal-400">
                mutateGql
              </code>{' '}
              with Swoff caching, auth, and offline queue.
            </p>
          </Link>
        </div>

        <div className="mt-16 border-t border-gray-200 pt-8 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Built with{' '}
            <a
              href="https://swoff.dev"
              className="text-teal-600 underline hover:text-teal-700 dark:text-teal-400"
            >
              Swoff
            </a>
            , TanStack Start, and Tailwind CSS.
          </p>
        </div>
      </div>
    </div>
  )
}
