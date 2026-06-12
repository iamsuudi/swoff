import { createFileRoute } from '@tanstack/react-router'
import { getCurrentUser } from '#/server/auth.rpc'

export const Route = createFileRoute('/api/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cookie = request.headers.get('cookie') || ''
        const match = cookie.match(/(?:^|;\s*)session=([^;]+)/)
        const sessionToken = match ? match[1] : undefined

        const user = await getCurrentUser({ data: { sessionToken } })
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify(user), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
