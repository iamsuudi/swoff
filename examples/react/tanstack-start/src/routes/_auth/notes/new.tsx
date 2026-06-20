import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from '@swoff/adapters/useMutation'
import { useMutationQueue } from '@swoff/adapters/useMutationQueue'
import NoteForm from '@/components/NoteForm'

export const Route = createFileRoute('/_auth/notes/new')({
  component: NoteCreatePage,
})

function NoteCreatePage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const { pending, isProcessing, retryAll } = useMutationQueue()
  const createMutation = useMutation<{ id: number }>('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    auth: true,
  })

  const handleSubmit = async (data: {
    title: string
    description: string
    priority: string
  }) => {
    const body = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setError(null)
    const result = await createMutation.mutate(JSON.stringify(body))

    if (result.status === 'queued') router.navigate({ to: '/' })
    if (result.status === 'success')
      router.navigate({ to: `/notes/${result.data.id}` })
    if (result.status === 'error')
      setError(result.error.message || 'Failed to create note')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            to="/"
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
            Back to Home
          </Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-700 dark:bg-gray-800">
          <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
            Create New Note
          </h1>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}
          {pending > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-900/20">
              <span className="text-amber-700 dark:text-amber-400">
                {pending} change{pending !== 1 ? 's' : ''} saved offline
                {isProcessing ? ' — syncing...' : ' — queued'}
              </span>
              {!isProcessing && (
                <button
                  onClick={retryAll}
                  className="ml-2 rounded-md border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30"
                >
                  Sync now
                </button>
              )}
            </div>
          )}
          <NoteForm
            onSubmit={handleSubmit}
            onCancel={() => router.navigate({ to: '/' })}
            submitLabel="Create Note"
            loading={createMutation.isLoading}
          />
        </div>
      </div>
    </div>
  )
}
