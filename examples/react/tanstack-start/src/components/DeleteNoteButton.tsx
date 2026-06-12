import { useMutation } from '@swoff/adapters/useMutation'

interface DeleteNoteButtonProps {
  id: number
  onDone: () => void
}

export default function DeleteNoteButton({ id, onDone }: DeleteNoteButtonProps) {
  const deleteMutation = useMutation(`/api/notes/${id}`, {
    method: 'DELETE',
    auth: true,
  })

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) return
    const result = await deleteMutation.mutate()
    if (result.status === 'success' || result.status === 'queued') {
      onDone()
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleteMutation.isLoading}
      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 disabled:opacity-50"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  )
}
