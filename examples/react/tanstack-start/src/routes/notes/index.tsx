import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

interface Note {
  id: number; title: string; description: string; priority: string; createdAt: string; updatedAt: string
}

const getNotes = createServerFn({ method: 'GET' }).handler(async () => {
  const { promises: fs } = await import('fs')
  const path = await import('path')
  const dataFile = path.join(process.cwd(), "data", "notes.json")
  try { const data = await fs.readFile(dataFile, "utf-8"); return JSON.parse(data) as Note[] }
  catch { return [] as Note[] }
})

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

export const Route = createFileRoute('/notes/')({
  component: NotesServerPage,
  validateSearch: (search: Record<string, unknown>) => ({ q: (search.q as string) || '' }),
  loaderDeps: ({ search: { q } }) => ({ q }),
  loader: async ({ deps: { q } }) => {
    const notes = await getNotes()
    const filtered = q
      ? notes.filter((n) => n.title.toLowerCase().includes(q.toLowerCase()) || n.description.toLowerCase().includes(q.toLowerCase()))
      : notes
    return { notes: filtered, q }
  },
})

function NotesServerPage() {
  const { notes, q } = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">Notes (Server)</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Server-rendered via createServerFn</p>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form method="GET" action="/notes" className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" name="q" defaultValue={q || ""} placeholder="Search notes..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500" />
          </form>
          <Link to="/notes/new"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:shadow-xl hover:-translate-y-0.5">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Note
          </Link>
        </div>

        {notes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note: Note) => (
              <div key={note.id} className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <Link to={`/notes/${note.id}`} className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 dark:text-white">{note.title}</h3>
                  </Link>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityColors[note.priority] || priorityColors.low}`}>
                    {note.priority}
                  </span>
                </div>
                <Link to={`/notes/${note.id}`} className="flex-1">
                  <p className="text-sm text-gray-500 line-clamp-3 dark:text-gray-400">{note.description}</p>
                </Link>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{new Date(note.updatedAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                    <Link to={`/notes/${note.id}/edit`}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {q ? "No notes found" : "No notes yet"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {q ? "Try a different search term" : "Create your first note to get started"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
