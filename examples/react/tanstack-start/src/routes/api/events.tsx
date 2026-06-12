import { createFileRoute } from '@tanstack/react-router'
import { addClient, removeClient } from '#/utils/sse'

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: async () => {
        let clientId: number | null = null

        const stream = new ReadableStream({
          start(controller) {
            clientId = addClient(controller)
            controller.enqueue(
              new TextEncoder().encode('event: connected\ndata: {}\n\n'),
            )
          },
          cancel() {
            if (clientId !== null) {
              removeClient(clientId)
            }
          },
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      },
    },
  },
})
