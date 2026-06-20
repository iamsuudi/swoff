export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { addClient, removeClient } from "@/utils/sse";

export async function GET(request: NextRequest) {
  let clientId: number | null = null;

  const stream = new ReadableStream({
    start(controller) {
      clientId = addClient(controller);
      controller.enqueue(
        new TextEncoder().encode(`event: connected\ndata: {}\n\n`),
      );
      request.signal.addEventListener("abort", () => {
        if (clientId !== null) {
          removeClient(clientId);
        }
      });
    },
    cancel() {
      if (clientId !== null) {
        removeClient(clientId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
