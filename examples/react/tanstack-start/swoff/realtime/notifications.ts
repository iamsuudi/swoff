/**
 * Swoff Push Notifications
 * Push subscription management with IndexedDB persistence.
 *
 * Usage:
 *   import { subscribeToPush, unsubscribeFromPush, isSubscribed } from './swoff/realtime/notifications.ts';
 *
 *   // Enable (triggers permission prompt)
 *   const subscription = await subscribeToPush();
 *   await fetch("/api/push/subscribe", {
 *     method: "POST",
 *     body: JSON.stringify(subscription.toJSON()),
 *   });
 *
 *   // Disable
 *   await unsubscribeFromPush();
 *
 * Window events:
 *   push-permission-changed   - Permission granted/denied (detail: { permission })
 *   push-subscription-changed - Subscribed/unsubscribed (detail: { subscribed })
 */

import { openDB } from "../db.ts";

const SUBSCRIPTION_DB = "swoff-push";
const SUBSCRIPTION_STORE = "subscription";
const VAPID_PUBLIC_KEY = "";

let permissionState: NotificationPermission | undefined = typeof Notification !== "undefined" ? Notification.permission : undefined;

/** Request notification permission from the user. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (permissionState === "granted") return true;
  if (permissionState === "denied") return false;

  const result = await Notification.requestPermission();
  permissionState = result;
  window.dispatchEvent(
    new CustomEvent("push-permission-changed", { detail: { permission: result } }),
  );
  return result === "granted";
}

/** Get the current push subscription, or null if not subscribed. */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Subscribe to push notifications. Returns the subscription or null if permission denied. Uses the VAPID public key from your swoff.config.json. */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });

  const db = await openDB(SUBSCRIPTION_DB, SUBSCRIPTION_STORE, "id");
  const tx = db.transaction(SUBSCRIPTION_STORE, "readwrite");
  tx.objectStore(SUBSCRIPTION_STORE).put({
    id: "current",
    endpoint: subscription.endpoint,
    keys: subscription.toJSON().keys,
    subscribedAt: Date.now(),
  });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  window.dispatchEvent(
    new CustomEvent("push-subscription-changed", { detail: { subscribed: true } }),
  );

  return subscription;
}

/** Unsubscribe from push notifications. */
export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getPushSubscription();
  if (!subscription) return;

  await subscription.unsubscribe();

  const db = await openDB(SUBSCRIPTION_DB, SUBSCRIPTION_STORE, "id");
  const tx = db.transaction(SUBSCRIPTION_STORE, "readwrite");
  tx.objectStore(SUBSCRIPTION_STORE).delete("current");
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  window.dispatchEvent(
    new CustomEvent("push-subscription-changed", { detail: { subscribed: false } }),
  );
}

/** Check if the user is subscribed to push notifications. */
export async function isSubscribed(): Promise<boolean> {
  const sub = await getPushSubscription();
  return sub !== null;
}

/** Convert a base64 VAPID public key to a Uint8Array for pushManager.subscribe(). */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}
