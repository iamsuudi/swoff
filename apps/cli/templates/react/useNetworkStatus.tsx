import { useState, useEffect, useRef } from "react";
import {
  CONNECTIVITY_EVENT,
  forceRetry,
  getCurrentOnlineStatus,
} from "../connectivity-manager.ts";

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
 * @returns {{ online: boolean, wasOffline: boolean, lastChangedAt: number | null, effectiveType: string | null, downlink: number | null, isRetrying: boolean, retry: () => Promise<void> }}
 */
export function useNetworkStatus() {
  const wasOfflineRef = useRef(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const [state, setState] = useState(() => {
    return {
      online: true,
      wasOffline: false,
      lastChangedAt: null as number | null,
      effectiveType:
        (typeof navigator !== "undefined" &&
          navigator.connection?.effectiveType) ||
        null,
      downlink:
        (typeof navigator !== "undefined" && navigator.connection?.downlink) ||
        null,
    };
  });

  // Manual trigger wrapper that handles local loading state
  const retry = async () => {
    setIsRetrying(true);
    await forceRetry();
    setIsRetrying(false);
  };

  useEffect(() => {
    // Sync with actual status after mount — prevents SSR hydration mismatch
    // where the server defaults to online:true but the browser is offline.
    if (!getCurrentOnlineStatus()) {
      wasOfflineRef.current = true;
      setState((s) => ({ ...s, online: false, wasOffline: true, lastChangedAt: Date.now() }));
    }

    const connection = navigator.connection;

    const handleConnectivityChange = (e: Event) => {
      const isTrulyOnline = (e as CustomEvent).detail.online;

      if (!isTrulyOnline) {
        wasOfflineRef.current = true;
      } else {
        wasOfflineRef.current = false;
      }

      setState((s) => ({
        ...s,
        online: isTrulyOnline,
        wasOffline: wasOfflineRef.current,
        lastChangedAt: Date.now(),
      }));
    };

    const onTypeChange = () => {
      if (!connection) return;
      setState((s: typeof state) => ({
        ...s,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
      }));
    };

    window.addEventListener(CONNECTIVITY_EVENT, handleConnectivityChange);
    if (connection) {
      connection.addEventListener("change", onTypeChange);
    }

    return () => {
      window.removeEventListener(CONNECTIVITY_EVENT, handleConnectivityChange);
      if (connection) {
        connection.removeEventListener("change", onTypeChange);
      }
    };
  }, []);

  return { ...state, isRetrying, retry };
}
