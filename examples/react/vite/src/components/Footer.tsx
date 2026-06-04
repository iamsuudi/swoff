import { useNetworkStatus } from "../../swoff/adapters/useNetworkStatus";
import { useStorageEstimate } from "../../swoff/adapters/useStorageEstimate";

export default function Footer() {
  const { online, effectiveType, downlink } = useNetworkStatus();
  const { percentUsed, formattedUsage, formattedQuota, loading } = useStorageEstimate();

  return (
    <footer className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between text-xs text-gray-400">
        <span>Swoff Demo</span>
        <div className="flex items-center gap-3">
          {!loading && (
            <span className="hidden sm:inline" title={`${formattedUsage} / ${formattedQuota}`}>
              Storage: {percentUsed}%
            </span>
          )}
          {effectiveType && (
            <span className="hidden sm:inline">{effectiveType.toUpperCase()} {downlink ? `(${downlink.toFixed(1)} Mb/s)` : ""}</span>
          )}
          <span className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-red-500"}`} />
            {online ? "Online" : "Offline"}
          </span>
        </div>
      </div>
    </footer>
  );
}
