# Push Notifications (replaces Web Push API)

> If you've worked with the Web Push API directly, Swoff provides the browser-side subscription management and SW push event handler — you just need a server endpoint to send the subscription and trigger pushes.

## Preconditions

- Swoff initialized with a registered service worker
- A server endpoint to store subscriptions and send push events (VAPID keys required)

## Enable

```bash
npx @swoff/cli add push-notification
```

Or set `features.pushNotifications: true` in `swoff.config.json` then regenerate.

## Generated files

| File                              | What it does                                                                                                               | Import in your code? |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `swoff/push-notification/index.ts` | `requestNotificationPermission()`, `subscribeToPush()`, `unsubscribeFromPush()`, `isSubscribed()`, `getPushSubscription()` | Yes                  |
| `swoff/sw/template.js`            | Push event handler — receives push events, displays notifications                                                          | No (built into SW)   |

## Usage

```ts
import {
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  getPushSubscription,
} from "./swoff/push-notification";

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

## React adapters

Swoff generates a hook for push subscription management (import from `./swoff/adapters`):

```tsx
import { usePushSubscription } from "./swoff/adapters/usePushSubscription";

function PushSettings() {
  const {
    subscribed,
    subscription,
    permission,
    loading,
    subscribe,
    unsubscribe,
  } = usePushSubscription();

  if (loading) return <Spinner />;
  if (permission === "denied")
    return <p>Notification permission blocked</p>;

  return (
    <div>
      {subscribed ? (
        <button onClick={unsubscribe}>Unsubscribe from Push</button>
      ) : (
        <button onClick={subscribe}>Enable Push Notifications</button>
      )}
    </div>
  );
}
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
    "pushNotifications": true
  }
}
```

- `pushNotifications` — enable push subscription management and SW push handler

The VAPID public key is set directly in the generated `swoff/push-notification/index.ts` file. Edit the `VAPID_PUBLIC_KEY` placeholder to match your key. Generate a key pair with `npx web-push generate-vapid-keys`.

## Related

- [Server push: real-time cache invalidation via SSE/WS](./10-server-push.md)
- [Caching strategies: how push interacts with caching](./02-caching-strategy.md)
- [Config reference: features](../CONFIG.md#featurespushnotifications)
