import { createServerOnlyFn } from '@tanstack/react-start'
import webPush from 'web-push'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

const VAPID_PUBLIC_KEY =
  'BJUUaF0CZdvMgRCIFV3Mw6n8HvekMpB9uqdUcQqj4GqOkJr377pKLlZQ2j_rhIUe3jB87GOueZavBnvqmV9KDrM'
const VAPID_PRIVATE_KEY = 'w0uoSa848tRc8tTCISXYl7y2Pc9SlpDoW-a_4V5-Nw0'

export { VAPID_PUBLIC_KEY }

interface PushPayload {
  title: string
  body: string
  icon?: string
}

webPush.setVapidDetails(
  'mailto:demo@swoff.dev',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
)

export const triggerPushNotification = createServerOnlyFn(
  async (payload: PushPayload): Promise<void> => {
    let subs: Record<string, unknown>[] = []
    try {
      const data = await fs.readFile(
        join(process.cwd(), 'data', 'push-subscriptions.json'),
        'utf-8',
      )
      subs = JSON.parse(data)
    } catch {
      return
    }

    const valid: Record<string, unknown>[] = []
    for (const sub of subs) {
      try {
        await webPush.sendNotification(
          sub as unknown as webPush.PushSubscription,
          JSON.stringify(payload),
        )
        valid.push(sub)
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number } | undefined)
          ?.statusCode
        if (statusCode !== 410 && statusCode !== 404) {
          valid.push(sub)
        }
      }
    }

    try {
      await fs.writeFile(
        join(process.cwd(), 'data', 'push-subscriptions.json'),
        JSON.stringify(valid, null, 2),
      )
    } catch {
      // Ignore write errors
    }
  },
)
