import { db } from "../db";
import { pushSubscriptions } from "../../db/schema";
import { eq } from "drizzle-orm";

export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export async function getAllSubscriptions() {
  return db.select().from(pushSubscriptions);
}

export async function subscribe(endpoint: string, keys: string) {
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const rows = await db
    .insert(pushSubscriptions)
    .values({ endpoint, keys })
    .returning();
  return rows[0];
}

export async function unsubscribe(endpoint: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  return { success: true };
}

export async function removeEndpoints(endpoints: string[]) {
  for (const ep of endpoints) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, ep));
  }
}
