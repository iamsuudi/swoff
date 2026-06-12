import { Link, createFileRoute } from '@tanstack/react-router'
import { useCachedFetch } from '@swoff/adapters/useCachedFetch'
import type { Note } from '@/lib/types'
import { priorityBadgeColors } from '#/utils/notes-ui'
import DeleteNoteButton from '@/components/DeleteNoteButton'

export const Route = createFileRoute('/notes/gql')({
  component: NotesGqlPage,
})

function NotesGqlPage() {
  const {
    data: notes,
    loading,
    error,
  } = useCachedFetch<Note[]>('/api/notes', {
    auth: true,
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Notes (GraphQL)
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Fetched via useCachedFetch with Swoff caching
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex-1" />
          <Link
            to="/notes"
            search={{ q: '' }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 mr-2"
          >
            Server Notes
          </Link>
          <Link
            to="/notes/new"
            className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-teal-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:shadow-xl hover:-translate-y-0.5"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Note
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
            {error.message}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : notes && notes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <Link
                    to={`/notes/$id`}
                    params={{ id: note.id.toString() }}
                    className="flex-1"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 dark:text-white">
                      {note.title}
                    </h3>
                  </Link>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityBadgeColors[note.priority] || priorityBadgeColors.low}`}
                  >
                    {note.priority}
                  </span>
                </div>
                <Link
                  to={`/notes/$id`}
                  params={{ id: note.id.toString() }}
                  className="flex-1"
                >
                  <p className="text-sm text-gray-500 line-clamp-3 dark:text-gray-400">
                    {note.description}
                  </p>
                </Link>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                  <DeleteNoteButton
                    id={note.id}
                    onDone={() => window.location.reload()}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              No notes found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create your first note to get started
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
