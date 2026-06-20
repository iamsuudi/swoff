import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/repositories/push-subscriptions";

export async function POST(request: Request) {
  const { endpoint } = await request.json();
  if (endpoint) {
    await unsubscribe(endpoint);
  }
  return NextResponse.json({ ok: true });
}
