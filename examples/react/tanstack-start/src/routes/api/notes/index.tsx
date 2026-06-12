import { createFileRoute } from '@tanstack/react-router'
import { broadcastInvalidation } from '#/utils/sse'
import { triggerPushNotification } from '#/utils/push'
import { getSessionUserId } from '#/utils/auth'
import { readNotes, writeNotes } from '#/utils/notes'

export const Route = createFileRoute('/api/notes/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const userId = getSessionUserId(request)
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        const notes = await readNotes()
        return new Response(JSON.stringify(notes), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
      POST: async ({ request }) => {
        const userId = getSessionUserId(request)
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        const body = await request.json()
        const notes = await readNotes()
        const newNote = {
          id: Date.now(),
          title: body.title,
          description: body.description,
          priority: body.priority || 'low',
          userId,
          createdAt: body.createdAt || new Date().toISOString(),
          updatedAt: body.updatedAt || new Date().toISOString(),
        }
        notes.push(newNote)
        await writeNotes(notes)
        triggerPushNotification({
          title: 'Note created',
          body: `"${newNote.title}" added`,
        }).catch(() => {})
        broadcastInvalidation(['notes'])
        return new Response(JSON.stringify(newNote), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
