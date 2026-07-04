import { ref, onMounted, onUnmounted } from "vue";
import {
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  getPushSubscription,
} from "../realtime/notifications";

export function useSwoffPush() {
  const subscribed = ref(false);
  const subscription = ref<PushSubscription | null>(null);
  const permission = ref(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );
  const loading = ref(true);

  onMounted(() => {
    let cancelled = false;

    isSubscribed().then((subd) => {
      if (cancelled) return;
      if (subd) {
        getPushSubscription().then((sub) => {
          if (cancelled) return;
          subscribed.value = true;
          subscription.value = sub;
          permission.value = Notification.permission;
          loading.value = false;
        });
      } else {
        subscribed.value = false;
        subscription.value = null;
        permission.value = Notification.permission;
        loading.value = false;
      }
    });

    function onSubChanged(e: CustomEvent) {
      if (cancelled) return;
      if (!e.detail.subscribed) {
        subscribed.value = false;
        subscription.value = null;
        permission.value = Notification.permission;
        loading.value = false;
      } else {
        getPushSubscription().then((sub) => {
          if (cancelled) return;
          subscribed.value = true;
          subscription.value = sub;
          permission.value = Notification.permission;
          loading.value = false;
        });
      }
    }

    function onPermissionChanged(e: CustomEvent) {
      if (cancelled) return;
      permission.value = e.detail.permission;
    }

    window.addEventListener("push-subscription-changed", onSubChanged);
    window.addEventListener("push-permission-changed", onPermissionChanged);

    onUnmounted(() => {
      cancelled = true;
      window.removeEventListener("push-subscription-changed", onSubChanged);
      window.removeEventListener("push-permission-changed", onPermissionChanged);
    });
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
