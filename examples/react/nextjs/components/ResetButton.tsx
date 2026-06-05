"use client";

import { useSwoffReset } from "@/swoff/adapters/useSwoffReset";

export default function ResetButton() {
  const { reset, isResetting, error } = useSwoffReset();

  const handleReset = async () => {
    if (
      !confirm(
        "This will clear all caches, local data, and re-register the service worker. Continue?",
      )
    )
      return;
    await reset({ clearStorage: true, resetSwCache: true });
  };

  return (
    <div>
      <button
        onClick={handleReset}
        disabled={isResetting}
        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/30"
      >
        {isResetting ? "Resetting..." : "Reset Swoff"}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-500">
          Reset failed: {error.message}
        </p>
      )}
    </div>
  );
}
