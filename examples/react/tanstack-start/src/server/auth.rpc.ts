import { createServerFn } from '@tanstack/react-start'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json')

interface UserRecord {
  id: number
  email: string
  name: string
  password: string
}

interface SessionData {
  userId: number
  email: string
}

function encodeSession(data: SessionData): string {
  return Buffer.from(JSON.stringify(data)).toString('base64')
}

function decodeSession(token: string): SessionData | null {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString())
  } catch {
    return null
  }
}

async function readUsers(): Promise<UserRecord[]> {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export const loginFn = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const users = await readUsers()
    const user = users.find(
      (u) => u.email === data.email && u.password === data.password,
    )
    if (!user) throw new Error('Invalid credentials')
    const sessionToken = encodeSession({ userId: user.id, email: user.email })
    return {
      user: { id: user.id, email: user.email, name: user.name },
      sessionToken,
    }
  })

export const registerFn = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string; name: string }) => data)
  .handler(async ({ data }) => {
    const users = await readUsers()
    if (users.find((u) => u.email === data.email)) {
      throw new Error('Email already registered')
    }
    const newUser: UserRecord = {
      id: users.length + 1,
      email: data.email,
      name: data.name,
      password: data.password,
    }
    users.push(newUser)
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2))
    const sessionToken = encodeSession({
      userId: newUser.id,
      email: newUser.email,
    })
    return {
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
      sessionToken,
    }
  })

export const getCurrentUser = createServerFn({ method: 'GET' })
  .validator((data: { sessionToken?: string }) => data)
  .handler(async ({ data }) => {
    if (!data.sessionToken) return null
    const session = decodeSession(data.sessionToken)
    if (!session) return null
    const users = await readUsers()
    const user = users.find((u) => u.id === session.userId)
    if (!user) return null
    return { id: user.id, email: user.email, name: user.name }
  })
