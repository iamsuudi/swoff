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
    const connection = navigator?.connection;
    return {
      online,
      wasOffline: false,
      lastChangedAt: null as number | null,
      effectiveType: connection?.effectiveType ?? null,
      downlink: connection?.downlink ?? null,
    };
  });

  useEffect(() => {
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

    const connection = navigator?.connection;
    const onTypeChange = () => {
      if (!connection) return;
      setState((s) => ({
        ...s,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
      }));
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (connection) {
      connection.addEventListener("change", onTypeChange);
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (connection) {
        connection.removeEventListener("change", onTypeChange);
      }
    };
  }, []);

  return state;
}
