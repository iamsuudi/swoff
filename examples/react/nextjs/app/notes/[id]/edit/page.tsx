"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getNote, updateNote } from "@/api/notes";
import NoteForm from "@/components/NoteForm";
import type { Note } from "@/api/notes";

export default function NoteEditPage() {
  const params = useParams();
  const router = useRouter();
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

  const handleSubmit = async (data: { title: string; description: string; priority: string }) => {
    try {
      await updateNote(id, data);
      router.push(`/notes/${id}`);
    } catch { alert("Failed to update note"); }
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
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href={`/notes/${id}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Note
          </Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-700 dark:bg-gray-800">
          <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Edit Note</h1>
          <NoteForm initialData={note} onSubmit={handleSubmit} onCancel={() => router.push(`/notes/${id}`)} />
        </div>
      </div>
    </div>
  );
}
