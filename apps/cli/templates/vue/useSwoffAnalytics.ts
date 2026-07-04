import { ref, onMounted, onUnmounted } from "vue";

export interface OfflineFallbackEvent {
  route: string;
  fallbackLevel: "route-fallback" | "offline-page" | "spa-shell" | "inline-503";
  timestamp: number;
}

/**
 * Tracks offline navigation fallback events dispatched by the Service Worker.
 *
 * Usage:
 *   const { lastEvent, events } = useSwoffAnalytics();
 *
 *   // Render an offline indicator when a fallback was served:
 *   <div v-if="lastEvent">
 *     Offline: served {{ lastEvent.fallbackLevel }} for {{ lastEvent.route }}
 *   </div>
 *
 *   // Or pass a callback:
 *   useSwoffAnalytics((event) => console.log("Fallback:", event));
 *
 * @returns {{ lastEvent: Ref<OfflineFallbackEvent | null>, events: Ref<OfflineFallbackEvent[]>, clear: () => void }}
 */
export function useSwoffAnalytics(callback?: (event: OfflineFallbackEvent) => void) {
  const events = ref<OfflineFallbackEvent[]>([]);
  const lastEvent = ref<OfflineFallbackEvent | null>(null);

  function handler(e: MessageEvent) {
    if (e.data?.type === "OFFLINE_FALLBACK_ACTIVATED" && e.data?.detail) {
      const detail = e.data.detail as OfflineFallbackEvent;
      events.value = [...events.value, detail];
      lastEvent.value = detail;
      callback?.(detail);
    }
  }

  onMounted(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    navigator.serviceWorker.addEventListener("message", handler);
  });

  onUnmounted(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    navigator.serviceWorker.removeEventListener("message", handler);
  });

  function clear() {
    events.value = [];
    lastEvent.value = null;
  }

  return { lastEvent, events, clear };
}
