import { useState, useEffect } from "react";
import { isPushConnected } from "../../swoff/server-push";

export default function Footer() {
  const [sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    setSseConnected(isPushConnected());

    const handler = (e: Event) => {
      setSseConnected((e as CustomEvent).detail.connected);
    };
    window.addEventListener("push-events-status", handler);
    return () => window.removeEventListener("push-events-status", handler);
  }, []);

  return (
    <footer className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between text-xs text-gray-400">
        <span>Swoff Demo</span>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              sseConnected ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          <span>SSE {sseConnected ? "connected" : "disconnected"}</span>
        </div>
      </div>
    </footer>
  );
}
