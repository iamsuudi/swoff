import { createFileRoute } from '@tanstack/react-router'
import { registerFn } from '#/server/auth.rpc'

export const Route = createFileRoute('/api/register')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { email, password, name } = await request.json()
        try {
          const result = await registerFn({ data: { email, password, name } })
          return new Response(JSON.stringify({ user: result.user }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Set-Cookie': `session=${result.sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`,
            },
          })
        } catch (err) {
          const status = (err as Error).message === 'Email already registered' ? 409 : 500
          return new Response(JSON.stringify({ error: (err as Error).message }), {
            status,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
