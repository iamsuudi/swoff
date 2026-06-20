interface SSEClient {
  id: number;
  controller: ReadableStreamDefaultController;
}

const clients: SSEClient[] = [];
let nextId = 1;

export function broadcastInvalidation(tags: string[]) {
  const data = JSON.stringify({ tags });
  for (const client of clients) {
    try {
      client.controller.enqueue(new TextEncoder().encode(`event: invalidate\ndata: ${data}\n\n`));
    } catch {
      const idx = clients.indexOf(client);
      if (idx !== -1) clients.splice(idx, 1);
    }
  }
}

export function addClient(controller: ReadableStreamDefaultController): number {
  const id = nextId++;
  clients.push({ id, controller });
  return id;
}

export function removeClient(id: number) {
  const idx = clients.findIndex((c) => c.id === id);
  if (idx !== -1) clients.splice(idx, 1);
}
