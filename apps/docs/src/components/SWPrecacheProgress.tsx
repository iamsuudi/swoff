import { Loader } from "lucide-react";
import { useSwoffPrecache } from "../../swoff/adapters/useSwoffPrecache";

export default function SWPrecacheProgress() {
  const { progress } = useSwoffPrecache();

  if (progress === 0 || progress >= 100) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-gray-800 px-4 py-3 text-sm text-white shadow-lg dark:bg-gray-700">
      <Loader className="h-4 w-4 animate-spin" />
      <span>Precaching&hellip;{progress}%</span>
    </div>
  );
}
