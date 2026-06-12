import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/logout')({
  server: {
    handlers: {
      POST: async () => {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
          },
        })
      },
    },
  },
})
