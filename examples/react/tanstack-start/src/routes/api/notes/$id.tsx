import { createFileRoute } from '@tanstack/react-router'
import { broadcastInvalidation } from '#/utils/sse'
import { triggerPushNotification } from '#/utils/push'
import { getSessionUserId } from '#/utils/auth'
import { readNotes, writeNotes } from '#/utils/notes'

export const Route = createFileRoute('/api/notes/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const userId = getSessionUserId(request)
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        const id = Number(params.id)
        const notes = await readNotes()
        const note = notes.find((n: any) => n.id === id)
        if (!note) {
          return new Response(JSON.stringify({ error: 'Note not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify(note), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
      PUT: async ({ request, params }) => {
        const userId = getSessionUserId(request)
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        const id = Number(params.id)
        const body = await request.json()
        const notes = await readNotes()
        const index = notes.findIndex((n: any) => n.id === id)
        if (index === -1) {
          return new Response(JSON.stringify({ error: 'Note not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        notes[index] = {
          ...notes[index],
          ...body,
          updatedAt: new Date().toISOString(),
        }
        await writeNotes(notes)
        triggerPushNotification({
          title: 'Note updated',
          body: `"${notes[index].title}" updated`,
        }).catch(() => {})
        broadcastInvalidation(['notes'])
        return new Response(JSON.stringify(notes[index]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
      DELETE: async ({ request, params }) => {
        const userId = getSessionUserId(request)
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        const id = Number(params.id)
        const notes = await readNotes()
        const index = notes.findIndex((n: any) => n.id === id)
        if (index === -1) {
          return new Response(JSON.stringify({ error: 'Note not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        const title = notes[index].title
        notes.splice(index, 1)
        await writeNotes(notes)
        triggerPushNotification({
          title: 'Note deleted',
          body: `"${title}" removed`,
        }).catch(() => {})
        broadcastInvalidation(['notes'])
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
