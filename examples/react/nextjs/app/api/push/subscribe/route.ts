import { NextResponse } from "next/server";
import { subscribe } from "@/lib/repositories/push-subscriptions";

export async function POST(request: Request) {
  const sub = await request.json();
  if (!sub || !sub.endpoint) {
    return NextResponse.json({ error: "Missing subscription" }, { status: 400 });
  }
  await subscribe(sub.endpoint, JSON.stringify(sub.keys || {}));
  return NextResponse.json({ ok: true });
}
