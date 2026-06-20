"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { queryGql, mutateGql } from "@/swoff/graphql/index";
import NoteCard from "@/components/NoteCard";
import Spinner from "@/components/Spinner";
import NotesEmptyState from "@/components/NotesEmptyState";
import type { Note } from "@/lib/repositories/notes";

const LIST_QUERY = `query GetNotes { notes { id title description priority createdAt updatedAt } }`;
const DELETE_MUTATION = `mutation DeleteNote($id: Int!) { deleteNote(id: $id) }`;

function NotesGqlPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await queryGql<{ notes: Note[] }>(LIST_QUERY, undefined, {
        auth: true,
      });
      setNotes(result.data?.notes || []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => fetchNotes();
    window.addEventListener("cache-invalidated", handler);
    const id = setTimeout(() => fetchNotes(), 0);
    return () => {
      window.removeEventListener("cache-invalidated", handler);
      clearTimeout(id);
    };
  }, [fetchNotes]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    setDeletingId(id);
    try {
      await mutateGql<{ deleteNote: boolean }>(
        DELETE_MUTATION,
        { id },
        { auth: true },
      );
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(String(err));
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Notes{" "}
            <span className="text-sm font-normal text-teal-500">(GraphQL)</span>
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Fetched via queryGql / mutateGql
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/notes"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Server Notes
            </Link>
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
        </div>

        <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs text-purple-600 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
          This page uses GraphQL via queryGql/mutateGql. Changes made on REST
          pages auto-refresh here via SSE cache invalidation.
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <Spinner />
        ) : filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            ))}
          </div>
        ) : (
          <NotesEmptyState searchQuery={searchQuery} />
        )}
      </div>
    </div>
  );
}

export default NotesGqlPage;
