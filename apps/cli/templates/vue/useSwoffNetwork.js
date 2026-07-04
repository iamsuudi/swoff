import { ref, onMounted, onUnmounted } from "vue";
import {
  CONNECTIVITY_EVENT,
  forceRetry,
  getCurrentOnlineStatus,
} from "../connectivity.js";

/**
 * Reactive network information: online status, connection type, and bandwidth.
 *
 * Usage:
 *   const { online, wasOffline, lastChangedAt, effectiveType, downlink } = useSwoffNetwork();
 *
 *   // Show offline indicator:
 *   <div v-if="!online">You are offline</div>
 *
 *   // Warn on slow connection:
 *   <div v-if="online && effectiveType === '2g'">Slow connection detected</div>
 */
export function useSwoffNetwork() {
  const online = ref(true);
  const wasOffline = ref(false);
  const lastChangedAt = ref(null);
  const effectiveType = ref(null);
  const downlink = ref(null);
  const isRetrying = ref(false);

  let wasOfflineFlag = false;

  onMounted(() => {
    if (!getCurrentOnlineStatus()) {
      wasOfflineFlag = true;
      online.value = false;
      wasOffline.value = true;
      lastChangedAt.value = Date.now();
    }

    const connection = navigator.connection;

    function handleConnectivityChange(e) {
      const isTrulyOnline = e.detail.online;
      if (!isTrulyOnline) {
        wasOfflineFlag = true;
      } else {
        wasOfflineFlag = false;
      }
      online.value = isTrulyOnline;
      wasOffline.value = wasOfflineFlag;
      lastChangedAt.value = Date.now();
    }

    function onTypeChange() {
      if (!connection) return;
      effectiveType.value = connection.effectiveType;
      downlink.value = connection.downlink;
    }

    window.addEventListener(CONNECTIVITY_EVENT, handleConnectivityChange);
    if (connection) {
      connection.addEventListener("change", onTypeChange);
    }

    onUnmounted(() => {
      window.removeEventListener(CONNECTIVITY_EVENT, handleConnectivityChange);
      if (connection) {
        connection.removeEventListener("change", onTypeChange);
      }
    });
  });

  async function retry() {
    isRetrying.value = true;
    await forceRetry();
    isRetrying.value = false;
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
