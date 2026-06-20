interface NotesEmptyStateProps {
  searchQuery?: string;
}

export default function NotesEmptyState({ searchQuery }: NotesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <svg
          className="h-8 w-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {searchQuery ? "No notes found" : "No notes yet"}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {searchQuery
          ? "Try a different search term"
          : "Create your first note to get started"}
      </p>
    </div>
  );
}
