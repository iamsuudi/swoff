import { usePwaInstall } from '@swoff/adapters/usePwaInstall'

export default function InstallButton() {
  const { canInstall, install } = usePwaInstall()
  if (!canInstall) return null

  return (
    <button
      onClick={install}
      className="rounded-lg border border-teal-500 px-3 py-1.5 text-xs font-medium text-teal-600 transition hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/30"
    >
      Install App
    </button>
  )
}
