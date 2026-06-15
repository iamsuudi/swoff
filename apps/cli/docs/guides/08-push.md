# Push Notifications (replaces Web Push API)

> If you've worked with the Web Push API directly, Swoff provides the browser-side subscription management and SW push event handler — you just need a server endpoint to send the subscription and trigger pushes.

## Preconditions

- Swoff initialized with a registered service worker
- A server endpoint to store subscriptions and send push events (VAPID keys required)

## Enable

```bash
npx @swoff/cli add push-notification
```

Or set `features.realtime.pushNotifications: true` and `features.realtime.vapidPublicKey` in `swoff.config.json` then regenerate.

## Generated files

| File                              | What it does                                                                                                               | Import in your code? |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `swoff/realtime/notifications.ts` | `requestNotificationPermission()`, `subscribeToPush()`, `unsubscribeFromPush()`, `isSubscribed()`, `getPushSubscription()` | Yes                  |
| `swoff/sw/template.js`            | Push event handler — receives push events, displays notifications                                                          | No (built into SW)   |

## Usage

```ts
import {
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  getPushSubscription,
} from "./swoff/realtime/notifications";

// Step 1: request permission (user gesture required)
const granted = await requestNotificationPermission();
if (!granted) return;

// Step 2: subscribe — returns PushSubscription
const subscription = await subscribeToPush();
// Send subscription to your server:
await fetch("/api/push/subscribe", {
  method: "POST",
  body: JSON.stringify(subscription.toJSON()),
});

// Step 3: check status
const sub = await getPushSubscription();
const subscribed = await isSubscribed();

// Step 4: unsubscribe
await unsubscribeFromPush();
await fetch("/api/push/unsubscribe", { method: "POST" });
```

### Server side (example)

The generated SW handles incoming push events and displays notifications. Your server sends push messages via the Web Push protocol:

```ts
// Server code (any language)
await webpush.sendNotification(
  subscription,
  JSON.stringify({
    title: "New Note",
    body: "Someone shared a note with you",
    icon: "/icon-192.png",
    data: { url: "/notes/123" },
  }),
);
```

## Customize

The push event handler is embedded in the generated SW (`swoff/sw/template.js`). It parses the push payload and calls `self.registration.showNotification()`. To customize notification appearance or behavior, edit the push event section in the template.

## Config

```json
{
  "features": {
    "realtime": {
      "pushNotifications": true,
      "vapidPublicKey": ""
    }
  }
}
```

- `pushNotifications` — enable push subscription management and SW push handler
- `vapidPublicKey` — your VAPID public key (required for push subscription). Generate with `npx web-push generate-vapid-keys`

## Related

- [Server push: real-time cache invalidation via SSE/WS](./09-server-push.md)
- [Config reference: realtime](../CONFIG.md#featuresrealtime)
