import { useSWUpdate } from "../../swoff/adapters/useSWUpdate";

export default function SWUpdatePrompt() {
  const { status, progress, error } = useSWUpdate();

  if (status === "idle" && !error) return null;
  if (status === "installing" && progress >= 100) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-gray-800 px-4 py-3 text-sm text-white shadow-lg dark:bg-gray-700">
      {status === "installing" && (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Updating app&hellip; {progress}%</span>
        </>
      )}
      {error && (
        <div className="flex items-center gap-2">
          <span className="text-red-400">&#10007;</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
