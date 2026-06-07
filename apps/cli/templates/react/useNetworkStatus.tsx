import { useState, useEffect, useRef } from "react";

/**
 * Reactive network information: online status, connection type, and bandwidth.
 *
 * Usage:
 *   const { online, wasOffline, lastChangedAt, effectiveType, downlink } = useNetworkStatus();
 *
 *   // Show offline indicator:
 *   if (!online) return <OfflineBanner />;
 *
 *   // Warn on slow connection:
 *   if (online && effectiveType === "2g") return <SlowConnectionWarning />;
 *
 * @returns {{ online: boolean, wasOffline: boolean, lastChangedAt: number | null, effectiveType: string | null, downlink: number | null }}
 */
export function useNetworkStatus() {
  const wasOfflineRef = useRef(false);

  const [state, setState] = useState(() => {
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;
    return {
      online,
      wasOffline: !online,
      lastChangedAt: null as number | null,
      effectiveType: null as string | null,
      downlink: null as number | null,
    };
  });

  useEffect(() => {
    const wasOffline = !navigator.onLine;
    if (wasOffline) wasOfflineRef.current = true;

    const connection = (navigator as any).connection;

    const onOnline = () => {
      setState((s) => ({
        ...s,
        online: true,
        lastChangedAt: Date.now(),
      }));
    };
    const onOffline = () => {
      wasOfflineRef.current = true;
      setState((s) => ({
        ...s,
        online: false,
        lastChangedAt: Date.now(),
        wasOffline: true,
      }));
    };

    const onTypeChange = () => {
      if (!connection) return;
      setState((s) => ({
        ...s,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
      }));
    };

    const onSWNotification = (event: MessageEvent) => {
      if (event.data?.type === "SW_NOTIFICATION" && event.data?.code === "FETCH_FAILED") {
        onOffline();
      }
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (connection) {
      connection.addEventListener("change", onTypeChange);
    }
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onSWNotification);
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (connection) {
        connection.removeEventListener("change", onTypeChange);
      }
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onSWNotification);
      }
    };
  }, []);

  return state;
}
