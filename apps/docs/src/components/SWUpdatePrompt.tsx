import { Loader } from "lucide-react";
import { useSWUpdate } from "../../swoff/adapters/useSWUpdate";
import { useEffect, useState } from "react";

export default function SWUpdatePrompt() {
  const { status, progress, error } = useSWUpdate();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (error) setIsVisible(false);
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
  }, [error]);

  if (status === "idle" && !error) return null;
  if (status === "installing" && progress >= 100) return null;
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-gray-800 px-4 py-3 text-sm text-white shadow-lg dark:bg-gray-700">
      {status === "installing" && (
        <>
          <Loader className="h-4 w-4 animate-spin" />
          <span>Installing service worker&hellip; {progress}%</span>
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
