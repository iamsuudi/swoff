import { writable } from "svelte/store";
import { onMount } from "svelte";

export function useSwoffAnalytics(callback) {
  const events = writable([]);
  const lastEvent = writable(null);

  function handler(e) {
    if (e.data?.type === "OFFLINE_FALLBACK_ACTIVATED" && e.data?.detail) {
      const detail = e.data.detail;
      events.update((prev) => [...prev, detail]);
      lastEvent.set(detail);
      callback?.(detail);
    }
  }

  onMount(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    navigator.serviceWorker.addEventListener("message", handler);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
    };
  });

  function clear() {
    events.set([]);
    lastEvent.set(null);
  }

  return { lastEvent, events, clear };
}
