import { createServerOnlyFn } from '@tanstack/react-start'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const DATA_FILE = path.join(process.cwd(), 'data', 'notes.json')

export const readNotes = createServerOnlyFn(async (): Promise<any[]> => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
})

export const writeNotes = createServerOnlyFn(async (notes: unknown[]): Promise<void> => {
  await fs.writeFile(DATA_FILE, JSON.stringify(notes, null, 2))
})
