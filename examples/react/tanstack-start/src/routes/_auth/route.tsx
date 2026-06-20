import { getAuth } from '@swoff/auth/store'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ location }) => {
    const user = await getAuth()

    if (!user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }

    // Pass user to child routes
    return { user }
  },
})
