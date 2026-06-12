import { createFileRoute } from '@tanstack/react-router'
import { loginFn } from '#/server/auth.rpc'

export const Route = createFileRoute('/api/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { email, password } = await request.json()
        try {
          const result = await loginFn({ data: { email, password } })
          return new Response(JSON.stringify({ user: result.user }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Set-Cookie': `session=${result.sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`,
            },
          })
        } catch (err) {
          return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
