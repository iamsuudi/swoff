import { useState, useEffect, useCallback } from "react";
import {
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  getPushSubscription,
} from "../realtime/notifications.js";

export function usePushSubscription() {
  const [state, setState] = useState(() => ({
    subscribed: false,
    subscription: null,
    permission: typeof Notification !== "undefined" ? Notification.permission : "denied",
    loading: true,
  }));

  useEffect(() => {
    let cancelled = false;

    isSubscribed().then((subscribed) => {
      if (cancelled) return;
      if (subscribed) {
        getPushSubscription().then((sub) => {
          if (cancelled) return;
          setState({ subscribed: true, subscription: sub, permission: Notification.permission, loading: false });
        });
      } else {
        setState({ subscribed: false, subscription: null, permission: Notification.permission, loading: false });
      }
    });

    const onSubChanged = (e) => {
      if (cancelled) return;
      if (!e.detail.subscribed) {
        setState({ subscribed: false, subscription: null, permission: Notification.permission, loading: false });
      } else {
        getPushSubscription().then((sub) => {
          if (cancelled) return;
          setState({ subscribed: true, subscription: sub, permission: Notification.permission, loading: false });
        });
      }
    };
    const onPermissionChanged = (e) => {
      if (cancelled) return;
      setState((s) => ({ ...s, permission: e.detail.permission }));
    };

    window.addEventListener("push-subscription-changed", onSubChanged);
    window.addEventListener("push-permission-changed", onPermissionChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("push-subscription-changed", onSubChanged);
      window.removeEventListener("push-permission-changed", onPermissionChanged);
    };
  }, []);

  const subscribe = useCallback(async () => {
    const sub = await subscribeToPush();
    return sub !== null;
  }, []);

  const unsubscribe = useCallback(async () => {
    await unsubscribeFromPush();
  }, []);

  return { ...state, subscribe, unsubscribe };
}
