import webPush from "web-push";
import { getAllSubscriptions, removeEndpoints } from "@/lib/repositories/push-subscriptions";

const VAPID_PUBLIC_KEY = "BJUUaF0CZdvMgRCIFV3Mw6n8HvekMpB9uqdUcQqj4GqOkJr377pKLlZQ2j_rhIUe3jB87GOueZavBnvqmV9KDrM";
const VAPID_PRIVATE_KEY = "w0uoSa848tRc8tTCISXYl7y2Pc9SlpDoW-a_4V5-Nw0";

export { VAPID_PUBLIC_KEY };

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
}

webPush.setVapidDetails("mailto:demo@swoff.dev", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export async function triggerPushNotification(payload: PushPayload): Promise<void> {
  let subs: Record<string, unknown>[] = [];
  try {
    const rows = await getAllSubscriptions();
    subs = rows.map((r) => ({
      endpoint: r.endpoint,
      keys: JSON.parse(r.keys || "{}"),
    }));
  } catch {
    return;
  }

  const validEndpoints: string[] = [];
  const removedEndpoints: string[] = [];
  for (const sub of subs) {
    try {
      await webPush.sendNotification(sub as unknown as webPush.PushSubscription, JSON.stringify(payload));
      validEndpoints.push(sub.endpoint as string);
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode !== 410 && statusCode !== 404) {
        validEndpoints.push(sub.endpoint as string);
      } else {
        removedEndpoints.push(sub.endpoint as string);
      }
    }
  }

  if (removedEndpoints.length > 0) {
    try {
      await removeEndpoints(removedEndpoints);
    } catch {
      // Ignore cleanup errors
    }
  }
}
