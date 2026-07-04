import { writable } from "svelte/store";
import { onMount } from "svelte";
import {
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  getPushSubscription,
} from "../realtime/notifications.js";

export function useSwoffPush() {
  const subscribed = writable(false);
  const subscription = writable(null);
  const permission = writable(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );
  const loading = writable(true);

  onMount(() => {
    let cancelled = false;

    isSubscribed().then((subd) => {
      if (cancelled) return;
      if (subd) {
        getPushSubscription().then((sub) => {
          if (cancelled) return;
          subscribed.set(true);
          subscription.set(sub);
          permission.set(Notification.permission);
          loading.set(false);
        });
      } else {
        subscribed.set(false);
        subscription.set(null);
        permission.set(Notification.permission);
        loading.set(false);
      }
    });

    function onSubChanged(e) {
      if (cancelled) return;
      if (!e.detail.subscribed) {
        subscribed.set(false);
        subscription.set(null);
        permission.set(Notification.permission);
        loading.set(false);
      } else {
        getPushSubscription().then((sub) => {
          if (cancelled) return;
          subscribed.set(true);
          subscription.set(sub);
          permission.set(Notification.permission);
          loading.set(false);
        });
      }
    }

    function onPermissionChanged(e) {
      if (cancelled) return;
      permission.set(e.detail.permission);
    }

    window.addEventListener("push-subscription-changed", onSubChanged);
    window.addEventListener("push-permission-changed", onPermissionChanged);

    return () => {
      cancelled = true;
      window.removeEventListener("push-subscription-changed", onSubChanged);
      window.removeEventListener("push-permission-changed", onPermissionChanged);
    };
  });

  async function subscribe() {
    const sub = await subscribeToPush();
    return sub !== null;
  }

  async function unsubscribe() {
    await unsubscribeFromPush();
  }

  return { subscribed, subscription, permission, loading, subscribe, unsubscribe };
}
