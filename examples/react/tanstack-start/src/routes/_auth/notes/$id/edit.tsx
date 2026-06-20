import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useCachedFetch } from '@swoff/adapters/useCachedFetch'
import { useMutation } from '@swoff/adapters/useMutation'
import NoteForm from '@/components/NoteForm'
import type { Note } from '@/lib/types'

export const Route = createFileRoute('/_auth/notes/$id/edit')({
  component: NoteEditPage,
})

function NoteEditPage() {
  const { id } = Route.useParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const { data: note, loading } = useCachedFetch<Note>(`/api/notes/${id}`, {
    auth: true,
  })
  const updateMutation = useMutation(`/api/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    auth: true,
  })

  const handleSubmit = async (data: {
    title: string
    description: string
    priority: string
  }) => {
    const body = { ...data, updatedAt: new Date().toISOString() }
    setError(null)
    const result = await updateMutation.mutate(JSON.stringify(body))
    if (result.status === 'success') router.navigate({ to: `/notes/${id}` })
    if (result.status === 'error')
      setError(result.error.message || 'Failed to update note')
    if (result.status === 'queued') router.navigate({ to: `/notes/${id}` })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    )
  }

  if (!note) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Note not found
          </h1>
          <Link
            to="/notes"
            search={{ q: '' }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-teal-500 px-5 py-2 text-sm font-medium text-teal-600 transition hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/30"
          >
            Back to Notes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            to={'/notes/$id'}
            params={{ id: note.id.toString() }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Note
          </Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-700 dark:bg-gray-800">
          <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
            Edit Note
          </h1>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}
          <NoteForm
            initialData={{
              title: note.title,
              description: note.description,
              priority: note.priority,
            }}
            onSubmit={handleSubmit}
            onCancel={() => router.navigate({ to: `/notes/${id}` })}
            submitLabel="Update Note"
            loading={updateMutation.isLoading}
          />
        </div>
      </div>
    </div>
  )
}
