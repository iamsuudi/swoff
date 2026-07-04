import { ref, onMounted, onUnmounted } from "vue";

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
 */
export function useSwoffAnalytics(callback) {
  const events = ref([]);
  const lastEvent = ref(null);

  function handler(e) {
    if (e.data?.type === "OFFLINE_FALLBACK_ACTIVATED" && e.data?.detail) {
      const detail = e.data.detail;
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
