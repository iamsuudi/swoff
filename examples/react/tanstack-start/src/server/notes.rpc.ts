import { createServerFn } from '@tanstack/react-start'
import { readNotes, writeNotes } from '#/utils/notes'

export const getNotes = createServerFn({ method: 'GET' }).handler(async () => {
  return await readNotes()
})

export const getNote = createServerFn({ method: 'GET' })
  .validator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const notes = await readNotes()
    return notes.find((n: any) => n.id === data.id) || null
  })

export const createNote = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      title: string
      description: string
      priority: string
      userId: number
    }) => data,
  )
  .handler(async ({ data }) => {
    const notes = await readNotes()
    const newNote = {
      id: Date.now(),
      title: data.title,
      description: data.description,
      priority: data.priority || 'low',
      userId: data.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    notes.push(newNote)
    await writeNotes(notes)
    return newNote
  })

export const updateNote = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      id: number
      title?: string
      description?: string
      priority?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const notes = await readNotes()
    const index = notes.findIndex((n: any) => n.id === data.id)
    if (index === -1) return null
    notes[index] = {
      ...notes[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    await writeNotes(notes)
    return notes[index]
  })

export const deleteNote = createServerFn({ method: 'POST' })
  .validator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const notes = await readNotes()
    const index = notes.findIndex((n: any) => n.id === data.id)
    if (index === -1) return false
    notes.splice(index, 1)
    await writeNotes(notes)
    return true
  })
