import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { getAuthState } from '@swoff/auth/state'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    getAuthState().then((state) => {
      if (!state.authenticated) {
        router.navigate({ to: '/login' })
      } else {
        setChecking(false)
      }
    })
    const handler = () =>
      getAuthState().then((state) => {
        if (!state.authenticated) router.navigate({ to: '/login' })
      })
    window.addEventListener('sw-auth-state-change', handler)
    window.addEventListener('sw-auth-unauthorized', () =>
      router.navigate({ to: '/login' }),
    )
    return () => {
      window.removeEventListener('sw-auth-state-change', handler)
      window.removeEventListener('sw-auth-unauthorized', handler)
    }
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return <>{children}</>
}
