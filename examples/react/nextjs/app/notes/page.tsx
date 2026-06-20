import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getAllNotes, deleteNote } from "@/lib/repositories/notes";
import NoteCard from "@/components/NoteCard";
import NotesEmptyState from "@/components/NotesEmptyState";

async function deleteNoteAction(id: number) {
  "use server";
  await deleteNote(id);
  redirect("/notes");
}

export default async function NotesServerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { q } = await searchParams;
  const notes = await getAllNotes(session.user.id);

  const filtered = q
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q.toLowerCase()) ||
          n.description.toLowerCase().includes(q.toLowerCase()),
      )
    : notes;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Notes (Server)
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Server-rendered — no client hooks
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form
            action="/notes"
            method="GET"
            className="relative flex-1 max-w-md"
          >
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              name="q"
              defaultValue={q || ""}
              placeholder="Search notes..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
          </form>
          <Link
            href="/notes/new"
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

        {filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                deleteAction={deleteNoteAction.bind(null, note.id)}
              />
            ))}
          </div>
        ) : (
          <NotesEmptyState searchQuery={q} />
        )}
      </div>
    </div>
  );
}
