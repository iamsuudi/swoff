import { useIsFetching } from "../../swoff/hooks/useIsFetching";

export default function GlobalLoadingBar() {
  const isFetching = useIsFetching();

  if (!isFetching) return null;

  return (
    <div className="fixed top-0 left-0 z-[100] h-0.5 w-full bg-gray-200 dark:bg-gray-700">
      <div className="h-full origin-left animate-pulse bg-gradient-to-r from-teal-400 via-emerald-500 to-teal-400" style={{ width: "40%" }} />
    </div>
  );
}
