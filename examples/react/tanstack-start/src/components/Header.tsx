import { useState, useEffect } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import InstallButton from '@/components/InstallButton'
import PushSubscribeButton from '@/components/PushSubscribeButton'
import { getAuthState } from '@swoff/auth/state'
import { clearAuth } from '@swoff/auth/store'

export default function Header() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)
  const [userName, setUserName] = useState('')

  const refresh = async () => {
    const state = await getAuthState()
    setAuthenticated(state.authenticated)
    setUserName((state.user?.name as string) || '')
  }

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    window.addEventListener('sw-auth-state-change', handler)
    window.addEventListener('sw-auth-unauthorized', () => {
      setAuthenticated(false)
      setUserName('')
    })
    return () => {
      window.removeEventListener('sw-auth-state-change', handler)
      window.removeEventListener('sw-auth-unauthorized', handler)
    }
  }, [])

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' })
    await clearAuth()
    window.dispatchEvent(new CustomEvent('sw-auth-state-change'))
    router.navigate({ to: '/' })
  }

  return (
    <header className="sticky top-0 z-50 border-b px-4 backdrop-blur-lg border-gray-700 bg-gray-900/80">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 py-3">
        <Link
          to="/"
          className="text-lg font-bold text-teal-600 dark:text-teal-400"
        >
          Swoff Notes
        </Link>
        <div className="ml-auto flex items-center gap-4 text-sm font-medium">
          <Link
            to="/"
            className="text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Home
          </Link>
          <Link
            to="/notes"
            search={{ q: '' }}
            className="text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Server
          </Link>
          <Link
            to="/notes/client"
            className="text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Client
          </Link>
          <Link
            to="/notes/gql"
            className="text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            GraphQL
          </Link>
          <Link
            to="/about"
            className="text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            About
          </Link>
          <InstallButton />
          {authenticated && <PushSubscribeButton />}
          {authenticated ? (
            <div className="flex items-center gap-3 ml-2 pl-3 border-l border-gray-200 dark:border-gray-700">
              <span className="text-teal-600 dark:text-teal-400 text-xs font-medium">
                {userName}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-500 transition hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="ml-2 rounded-lg bg-linear-to-r from-teal-500 to-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:shadow-xl hover:-translate-y-0.5"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
