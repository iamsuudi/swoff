import { useNetworkStatus } from '@swoff/adapters/useNetworkStatus'

export default function NetworkStatusBanner() {
  const { online, wasOffline, effectiveType } = useNetworkStatus()

  if (online && !wasOffline) return null

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-2 text-xs font-medium shadow-lg transition-all ${
        online ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
      }`}
    >
      {online
        ? `Back online${effectiveType ? ` (${effectiveType})` : ''}`
        : 'Offline — changes queued'}
    </div>
  )
}
