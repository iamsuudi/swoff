import { Link, useNavigate } from "react-router-dom";
import { fetchWithCache } from "../../swoff/fetch-wrapper";
import { queueMutation } from "../../swoff/mutation-queue";
import { generateTags } from "../../swoff/invalidation-tags";
import NoteForm from "../components/NoteForm";

export default function NotesCreatePage() {
  const navigate = useNavigate();

  const handleSubmit = async (data: Record<string, string>) => {
    const body = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      await queueMutation({
        method: "POST",
        url: "/api/notes",
        body,
        tags: generateTags("/api/notes"),
      });
      navigate("/notes");
      return;
    }

    const { response: res } = await fetchWithCache("/api/notes", {
      method: "POST",
      auth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const note = await res.json();
    navigate(`/notes/${note.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            to="/notes"
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
            Back to Notes
          </Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-700 dark:bg-gray-800">
          <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
            Create New Note
          </h1>
          <NoteForm
            onSubmit={handleSubmit}
            onCancel={() => navigate("/notes")}
            submitLabel="Create Note"
          />
        </div>
      </div>
    </div>
  );
}
