import { writable } from "svelte/store";
import { onMount } from "svelte";

export interface OfflineFallbackEvent {
  route: string;
  fallbackLevel: "route-fallback" | "offline-page" | "spa-shell" | "inline-503";
  timestamp: number;
}

export function useSwoffAnalytics(callback?: (event: OfflineFallbackEvent) => void) {
  const events = writable<OfflineFallbackEvent[]>([]);
  const lastEvent = writable<OfflineFallbackEvent | null>(null);

  function handler(e: MessageEvent) {
    if (e.data?.type === "OFFLINE_FALLBACK_ACTIVATED" && e.data?.detail) {
      const detail = e.data.detail as OfflineFallbackEvent;
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
