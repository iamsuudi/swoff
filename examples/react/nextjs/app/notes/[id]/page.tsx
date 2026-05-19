"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getNote, deleteNote } from "@/api/notes";
import type { Note } from "@/api/notes";

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  low: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
};

export default function NoteDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setIsLoading(true);
        setNote(await getNote(id));
      } catch { setNote(null); }
      finally { setIsLoading(false); }
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await deleteNote(id);
      window.location.href = "/";
    } catch { alert("Failed to delete note"); }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Note not found</h1>
          <Link href="/" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-teal-500 px-5 py-2 text-sm font-medium text-teal-600 transition hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/30">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/notes/${note.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
              Edit
            </Link>
            <button onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-red-900/30">
              Delete
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <h1 className="flex-1 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">{note.title}</h1>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${priorityColors[note.priority] || priorityColors.low}`}>{note.priority}</span>
          </div>
          <p className="whitespace-pre-wrap text-gray-600 leading-relaxed dark:text-gray-400">{note.description}</p>
          <div className="mt-8 flex flex-wrap gap-4 border-t border-gray-200 pt-6 text-xs text-gray-400 dark:border-gray-700">
            <span>Created: {new Date(note.createdAt).toLocaleDateString()}</span>
            <span>Updated: {new Date(note.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
