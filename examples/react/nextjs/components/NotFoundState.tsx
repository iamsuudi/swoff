import BackButton from "./BackButton";

export default function NotFoundState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Note not found
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          This note may have been deleted
        </p>
        <div className="mt-4">
          <BackButton href="/notes" label="Back to Notes" />
        </div>
      </div>
    </div>
  );
}
