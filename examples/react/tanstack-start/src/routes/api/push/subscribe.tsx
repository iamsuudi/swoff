import { createFileRoute } from '@tanstack/react-router'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const DATA_FILE = path.join(process.cwd(), 'data', 'push-subscriptions.json')

export const Route = createFileRoute('/api/push/subscribe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sub = await request.json()
        if (!sub || !sub.endpoint) {
          return new Response(JSON.stringify({ error: 'Missing subscription' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        let subs: Record<string, unknown>[] = []
        try {
          const data = await fs.readFile(DATA_FILE, 'utf-8')
          subs = JSON.parse(data)
        } catch {}
        const filtered = subs.filter((s: any) => s.endpoint !== sub.endpoint)
        filtered.push(sub)
        await fs.writeFile(DATA_FILE, JSON.stringify(filtered, null, 2))
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
