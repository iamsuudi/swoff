import { useSWProgress } from "../../swoff/adapters/useSWUpdate";

export default function SWProgressBar() {
  const { status, progress } = useSWProgress();

  if (status === "idle") return null;

  return (
    <div className="fixed top-0 left-0 z-60 h-1 w-full bg-gray-200 dark:bg-gray-700">
      <div
        className="h-full bg-teal-500 transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
