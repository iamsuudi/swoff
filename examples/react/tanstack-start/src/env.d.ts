declare module 'web-push' {
  interface PushSubscription {
    endpoint: string
    keys: { auth: string; p256dh: string }
  }
  interface PushPayload {
    title: string
    body: string
    icon?: string
  }
  export function setVapidDetails(
    email: string,
    publicKey: string,
    privateKey: string,
  ): void
  export function sendNotification(
    subscription: PushSubscription,
    payload?: string,
  ): Promise<void>
}
