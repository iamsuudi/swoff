import { createFileRoute } from '@tanstack/react-router'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { broadcastInvalidation } from '#/utils/sse'
import { triggerPushNotification } from '#/utils/push'

const NOTES_PATH = path.join(process.cwd(), 'data', 'notes.json')

interface NoteRecord {
  id: number; title: string; description: string; priority: string
  createdAt: string; updatedAt?: string; userId?: number
}

function getUserId(request: Request): number | null {
  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/)
  if (!match) return null
  try {
    const data = JSON.parse(Buffer.from(match[1], 'base64').toString())
    return data.userId || null
  } catch {
    return null
  }
}

export const Route = createFileRoute('/api/graphql')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = getUserId(request)
          const { query, variables } = await request.json()
          const data = await fs.readFile(NOTES_PATH, 'utf-8')
          const notes: NoteRecord[] = JSON.parse(data)

          if (query?.includes('GetNotes')) {
            const filtered = userId ? notes.filter((n) => n.userId === userId) : notes
            return new Response(JSON.stringify({ data: { notes: filtered } }), {
              headers: { 'Content-Type': 'application/json' },
            })
          }

          if (query?.includes('GetNote')) {
            const id = variables?.id
            const note = notes.find((n) => n.id === id)
            if (!note) {
              return new Response(JSON.stringify({ errors: [{ message: 'Not found' }] }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
              })
            }
            return new Response(JSON.stringify({ data: { note } }), {
              headers: { 'Content-Type': 'application/json' },
            })
          }

          if (query?.includes('CreateNote')) {
            if (!userId) {
              return new Response(JSON.stringify({ errors: [{ message: 'Unauthorized' }] }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              })
            }
            const { title, description, priority } = variables || {}
            const newNote: NoteRecord = {
              id: Date.now(), title: title || 'Untitled', description: description || '',
              priority: priority || 'medium', createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(), userId,
            }
            notes.push(newNote)
            await fs.writeFile(NOTES_PATH, JSON.stringify(notes, null, 2))
            triggerPushNotification({ title: 'Note created', body: `"${newNote.title}" added` }).catch(() => {})
            broadcastInvalidation(['notes'])
            return new Response(JSON.stringify({ data: { createNote: newNote } }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          if (query?.includes('UpdateNote')) {
            if (!userId) {
              return new Response(JSON.stringify({ errors: [{ message: 'Unauthorized' }] }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              })
            }
            const { id, title, description, priority } = variables || {}
            const idx = notes.findIndex((n) => n.id === id)
            if (idx === -1) {
              return new Response(JSON.stringify({ errors: [{ message: 'Not found' }] }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
              })
            }
            notes[idx] = {
              ...notes[idx], ...(title !== undefined ? { title } : {}),
              ...(description !== undefined ? { description } : {}),
              ...(priority !== undefined ? { priority } : {}),
              updatedAt: new Date().toISOString(),
            }
            await fs.writeFile(NOTES_PATH, JSON.stringify(notes, null, 2))
            triggerPushNotification({ title: 'Note updated', body: `"${notes[idx].title}" updated` }).catch(() => {})
            broadcastInvalidation(['notes'])
            return new Response(JSON.stringify({ data: { updateNote: notes[idx] } }), {
              headers: { 'Content-Type': 'application/json' },
            })
          }

          if (query?.includes('DeleteNote')) {
            if (!userId) {
              return new Response(JSON.stringify({ errors: [{ message: 'Unauthorized' }] }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              })
            }
            const id = variables?.id
            const idx = notes.findIndex((n) => n.id === id)
            if (idx === -1) {
              return new Response(JSON.stringify({ errors: [{ message: 'Not found' }] }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
              })
            }
            const deletedTitle = notes[idx].title
            notes.splice(idx, 1)
            await fs.writeFile(NOTES_PATH, JSON.stringify(notes, null, 2))
            triggerPushNotification({ title: 'Note deleted', body: `"${deletedTitle}" removed` }).catch(() => {})
            broadcastInvalidation(['notes'])
            return new Response(JSON.stringify({ data: { deleteNote: { id } } }), {
              headers: { 'Content-Type': 'application/json' },
            })
          }

          return new Response(JSON.stringify({ errors: [{ message: 'Unknown query' }] }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (err) {
          return new Response(JSON.stringify({ errors: [{ message: String(err) }] }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
