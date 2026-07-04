import { writable } from "svelte/store";
import { onMount } from "svelte";
import {
  CONNECTIVITY_EVENT,
  forceRetry,
  getCurrentOnlineStatus,
} from "../connectivity";

export function useSwoffNetwork() {
  const online = writable(true);
  const wasOffline = writable(false);
  const lastChangedAt = writable<number | null>(null);
  const effectiveType = writable<string | null>(null);
  const downlink = writable<number | null>(null);
  const isRetrying = writable(false);

  let wasOfflineFlag = false;

  onMount(() => {
    if (!getCurrentOnlineStatus()) {
      wasOfflineFlag = true;
      online.set(false);
      wasOffline.set(true);
      lastChangedAt.set(Date.now());
    }

    const connection = navigator.connection;

    function handleConnectivityChange(e: Event) {
      const isTrulyOnline = (e as CustomEvent).detail.online;
      if (!isTrulyOnline) {
        wasOfflineFlag = true;
      } else {
        wasOfflineFlag = false;
      }
      online.set(isTrulyOnline);
      wasOffline.set(wasOfflineFlag);
      lastChangedAt.set(Date.now());
    }

    function onTypeChange() {
      if (!connection) return;
      effectiveType.set(connection.effectiveType);
      downlink.set(connection.downlink);
    }

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
  });

  async function retry() {
    isRetrying.set(true);
    await forceRetry();
    isRetrying.set(false);
  }

  return {
    online,
    wasOffline,
    lastChangedAt,
    effectiveType,
    downlink,
    isRetrying,
    retry,
  };
}
