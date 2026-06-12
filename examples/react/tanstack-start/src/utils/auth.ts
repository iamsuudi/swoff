import { createServerOnlyFn } from '@tanstack/react-start'

export const getSessionUserId = createServerOnlyFn((request: Request): number | null => {
  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/)
  if (!match) return null
  try {
    const data = JSON.parse(Buffer.from(match[1], 'base64').toString())
    return data.userId || null
  } catch {
    return null
  }
})
