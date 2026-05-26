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
    isSubscribed().then((subscribed) => {
      if (subscribed) {
        getPushSubscription().then((sub) => {
          setState({ subscribed: true, subscription: sub, permission: Notification.permission, loading: false });
        });
      } else {
        setState({ subscribed: false, subscription: null, permission: Notification.permission, loading: false });
      }
    });

    const onSubChanged = (e: CustomEvent) => {
      if (!e.detail.subscribed) {
        setState({ subscribed: false, subscription: null, permission: Notification.permission, loading: false });
      } else {
        getPushSubscription().then((sub) => {
          setState({ subscribed: true, subscription: sub, permission: Notification.permission, loading: false });
        });
      }
    };
    const onPermissionChanged = (e: CustomEvent) => {
      setState((s) => ({ ...s, permission: e.detail.permission }));
    };

    window.addEventListener("push-subscription-changed", onSubChanged as EventListener);
    window.addEventListener("push-permission-changed", onPermissionChanged as EventListener);
    return () => {
      window.removeEventListener("push-subscription-changed", onSubChanged as EventListener);
      window.removeEventListener("push-permission-changed", onPermissionChanged as EventListener);
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
