import { useState, useEffect, useCallback } from "react";
import {
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  getPushSubscription,
} from "../push.ts";

export function usePushSubscription(vapidPublicKey: string) {
  const [state, setState] = useState({
    subscribed: false,
    subscription: null as PushSubscription | null,
    permission: Notification.permission,
    loading: true,
  });

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

    const onSubChanged = (e: CustomEvent) => {
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
    const onPermissionChanged = (e: CustomEvent) => {
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
    const sub = await subscribeToPush(vapidPublicKey);
    return sub !== null;
  }, [vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    await unsubscribeFromPush();
  }, []);

  return { ...state, subscribe, unsubscribe };
}
