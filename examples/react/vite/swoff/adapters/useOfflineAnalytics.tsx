import { useState, useEffect, useCallback } from "react";

export interface OfflineFallbackEvent {
  route: string;
  fallbackLevel: "route-fallback" | "offline-page" | "spa-shell" | "inline-503";
  timestamp: number;
}

/**
 * Tracks offline navigation fallback events dispatched by the Service Worker.
 *
 * Usage:
 *   const { lastEvent, events } = useOfflineAnalytics();
 *
 *   // Render an offline indicator when a fallback was served:
 *   if (lastEvent) {
 *     return <div>Offline: served {lastEvent.fallbackLevel} for {lastEvent.route}</div>;
 *   }
 *
 *   // Or pass a callback:
 *   useOfflineAnalytics((event) => console.log("Fallback:", event));
 *
 * @returns {{ lastEvent: OfflineFallbackEvent | null, events: OfflineFallbackEvent[], clear: () => void }}
 */
export function useOfflineAnalytics(callback?: (event: OfflineFallbackEvent) => void) {
  const [events, setEvents] = useState<OfflineFallbackEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<OfflineFallbackEvent | null>(null);

  const handler = useCallback((event: MessageEvent) => {
    if (event.data?.type === "OFFLINE_FALLBACK_ACTIVATED" && event.data?.detail) {
      const detail = event.data.detail as OfflineFallbackEvent;
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
