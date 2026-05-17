import { useState } from "react";
import type { Note } from "../api/notes";

interface NoteFormProps {
  initialData?: Note;
  onSubmit: (data: { title: string; description: string; priority: string }) => void;
  onCancel?: () => void;
}

export default function NoteForm({ initialData, onSubmit, onCancel }: NoteFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [priority, setPriority] = useState(initialData?.priority || "low");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), priority });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
        <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title..."
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" required />
      </div>
      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Write your note..." rows={6}
          className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" required />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
        <div className="flex gap-2">
          {(["low", "medium", "high"] as const).map((p) => (
            <button key={p} type="button" onClick={() => setPriority(p)}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium capitalize transition ${
                priority === p
                  ? p === "high" ? "border-red-400 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    : p === "medium" ? "border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                    : "border-emerald-400 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}>{p}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">Cancel</button>
        )}
        <button type="submit"
          className="flex-1 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:shadow-xl hover:-translate-y-0.5">
          {initialData ? "Update Note" : "Create Note"}
        </button>
      </div>
    </form>
  );
}
