import { useState, useEffect, useCallback } from "react";

/**
 * Tracks offline navigation fallback events dispatched by the Service Worker.
 *
 * Usage:
 *   const { lastEvent, events } = useSwoffAnalytics();
 *
 *   // Render an offline indicator when a fallback was served:
 *   if (lastEvent) {
 *     return <div>Offline: served {lastEvent.fallbackLevel} for {lastEvent.route}</div>;
 *   }
 *
 *   // Or pass a callback:
 *   useSwoffAnalytics((event) => console.log("Fallback:", event));
 */
export function useSwoffAnalytics(callback) {
  const [events, setEvents] = useState([]);
  const [lastEvent, setLastEvent] = useState(null);

  const handler = useCallback((event) => {
    if (event.data?.type === "OFFLINE_FALLBACK_ACTIVATED" && event.data?.detail) {
      const detail = event.data.detail;
      setEvents((prev) => [...prev, detail]);
      setLastEvent(detail);
      callback?.(detail);
    }
  }, [callback]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [handler]);

  const clear = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  return { lastEvent, events, clear };
}
