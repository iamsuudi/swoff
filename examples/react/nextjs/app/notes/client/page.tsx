"use client";

import { useState } from "react";
import Link from "next/link";
import { useCachedFetch } from "@/swoff/adapters/useCachedFetch";
import { fetchWithCache } from "@/swoff/fetch/core";
import { useMutationQueue } from "@/swoff/adapters/useMutationQueue";
import NoteCard from "@/components/NoteCard";
import Spinner from "@/components/Spinner";
import NotesEmptyState from "@/components/NotesEmptyState";
import type { Note } from "@/lib/repositories/notes";

function NotesClientPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { data: notes, loading } = useCachedFetch<Note[]>("/api/notes", {
    auth: true,
    keepPreviousData: true,
    placeholderData: [],
  });
  const { pending, isProcessing, retryAll } = useMutationQueue();

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    setDeletingId(id);
    try {
      const { response } = await fetchWithCache(`/api/notes/${id}`, {
        method: "DELETE",
        auth: true,
      });
      if (response.ok) {
        window.dispatchEvent(
          new CustomEvent("cache-invalidated", { detail: { tags: ["notes"] } }),
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = (notes ?? []).filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Notes (Client)
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Client-rendered with hooks — offline-capable via SW cache
          </p>
        </div>

        {pending > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-900/20">
            <span className="text-amber-700 dark:text-amber-400">
              {pending} change{pending !== 1 ? "s" : ""} saved offline
              {isProcessing ? " — syncing..." : " — queued"}
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

export default NotesClientPage;
