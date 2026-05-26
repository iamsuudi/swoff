/**
 * Swoff Push Notifications
 * Push subscription management with IndexedDB persistence.
 *
 * Usage:
 *   import { subscribeToPush, unsubscribeFromPush, isSubscribed } from './swoff/push.ts';
 *
 *   // Enable (triggers permission prompt)
 *   const subscription = await subscribeToPush("YOUR_VAPID_PUBLIC_KEY");
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

const SUBSCRIPTION_DB = "swoff-push";
const SUBSCRIPTION_STORE = "subscription";

let permissionState = Notification.permission;

function openPushDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(SUBSCRIPTION_DB, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SUBSCRIPTION_STORE)) {
        db.createObjectStore(SUBSCRIPTION_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

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

/** Subscribe to push notifications. Returns the subscription or null if permission denied. */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });

  const db = await openPushDB();
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

  const db = await openPushDB();
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
