"use client";

import { useSWUpdate } from "@/swoff/adapters/useSWUpdate";

export default function UpdatePrompt() {
  const { updateStatus, currentVersion, availableVersion, progress, forceUpdate, acceptUpdate, dismissUpdate } = useSWUpdate();

  if (updateStatus === "idle") return null;

  return (
    <div className={`fixed ${forceUpdate ? "inset-0 z-[100] flex items-center justify-center bg-black/50" : "bottom-4 right-4 z-50"}`}>
      <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${forceUpdate ? "max-w-sm" : ""}`}>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          {forceUpdate ? "A required update is available:" : "Update available:"}{" "}
          <span className="font-medium text-gray-900 dark:text-white">v{currentVersion} → v{availableVersion}</span>
        </p>
        {updateStatus === "downloading" ? (
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={acceptUpdate}
              className="rounded-lg bg-teal-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-teal-600">
              {forceUpdate ? "Update Now" : "Update"}
            </button>
            {!forceUpdate && (
              <button onClick={dismissUpdate}
                className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                Later
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
